# CONTRAT D'INTERFACES — Maisons Naturéa

**Version : 2.0** · **Mise à jour : 4 juin 2026** · **Portail : V16** · **6 apps embarquées**

> Ce document est la source de vérité partagée entre le portail et les 6 apps embarquées.
> **À mettre à jour à chaque modification d'une clé localStorage ou d'une structure de données partagée.**
> À placer en pièce jointe dans CHAQUE projet Claude (Portail + 6 apps).

---

## Architecture générale

```
┌───────────────────────────────────────────────────────────────────────┐
│                        PORTAIL V16                                      │
│  • Vue Réseau (animateur/codir) → KPI agrégés                          │
│  • Tableaux de bord par rôle (franchisé / conducteur / commercial)    │
│    → KPI filtrés sur l'agence attribuée                               │
│  Lit le localStorage du navigateur (sans le modifier)                 │
│  Embarque les 6 apps en base64 dans APP_HTML_B64.{NOM}                │
└──┬──────┬──────────┬───────────┬─────────────┬──────────┬─────────────┘
   │      │          │           │             │          │
 iframe iframe     iframe      iframe        iframe     iframe
   │      │          │           │             │          │
┌──▼──┐ ┌─▼────┐ ┌───▼────┐ ┌────▼──────┐ ┌────▼─────┐ ┌──▼────────┐
│CODIR│ │RECRUT│ │OSSATURE│ │   AUDIT   │ │CHIFFRAGE │ │ AUDIT_COM │
│     │ │      │ │ track  │ │(technique)│ │          │ │(commerce) │
└──┬──┘ └─┬────┘ └───┬────┘ └────┬──────┘ └────┬─────┘ └──┬────────┘
   └──────┴──────────┴───────────┴─────────────┴──────────┘
                          │
                  localStorage navigateur (clés partagées ci-dessous)
```

**Slots `APP_HTML_B64`** : `CODIR`, `RECRUT`, `OSSATURE`, `AUDIT` (= audit technique), `CHIFFRAGE`, `AUDIT_COM` (= audit commerce).

**Principe** : chaque app écrit ses données dans des clés localStorage bien définies. Le portail lit ces clés (sans les modifier) pour calculer les KPI. Les apps ne se parlent jamais directement entre elles.

---

## Clés localStorage par app

| App (slot) | Clé(s) localStorage | Lue par le portail |
|---|---|---|
| CODIR | `codir:data:v4` | oui |
| Recrutement (RECRUT) | `fhv3` | oui |
| Ossature track (OSSATURE) | `ossature_orders` | oui |
| Audit technique (AUDIT) | `naturea_pc_v1` | oui |
| Chiffrage (CHIFFRAGE) | `chiffrage:mes_projets:v1`, `chiffrage:tarifs_history:v1` | oui |
| Audit commerce (AUDIT_COM) | `fnet:data:v1` | oui |

---

### CODIR · `codir:data:v4`
**Rôle** : pilotage exécutif (membres, plan d'actions, thèmes) · **Écrit par** : CODIR

```javascript
{
  members: [ { id, name, role, ... } ],
  actions: [ { id, title, status:"à faire"|"en cours"|"terminé"|"bloqué",
               deadline:"YYYY-MM-DD"|null /* ← lu */, ... } ],
  themes:  [ { id, label, color, ... } ]
}
```
**KPI portail** : Actions cette semaine = `deadline` dans les 7 prochains jours et `status !== "terminé"` (rappel : `null >= 0` est `true` en JS → actions sans deadline incluses, volontaire).

---

### Recrutement · `fhv3`
**Rôle** : pipeline candidats franchisés · **Écrit par** : Recrutement

```javascript
[ { id, nom, statut:"Nouveau"|"Contact"|"Entretien"|"Validé"|"Refusé"|"Signé",
    date:"YYYY-MM-DD", questionnaire:{...} /* non lu */, ... } ]
```
**KPI portail** : Candidats actifs = `statut !== "Refusé"` · Nouveaux 7j = `date` dans les 7 derniers jours.

---

### Ossature track · `ossature_orders`
**Rôle** : suivi devis → fabrication → expédition · **Écrit par** : OssatureTrack

```javascript
[ {
    id, client, franchise:string /* ← lu (dashboards) */,
    statut:"Devis demandé"|"Devis envoyé"|"Commande confirmée"|"Expédition validée" /* ← lu */,
    surface:number, date:"YYYY-MM-DD", ...
} ]
```
> ⚠️ Les 4 statuts canoniques ci-dessus (constante `STATUTS`) sont ceux lus par le portail. Ne pas renommer.

**KPI portail** :
- Vue Réseau : volumétrie globale par statut.
- Dashboard agence (franchisé/conducteur/commercial) : comptes filtrés sur `franchise` (= agence du user) → Devis demandés / Devis envoyés (« reçus ») / Commandes confirmées / Expéditions.

---

### Audit technique · `naturea_pc_v1`
**Rôle** : audits qualité chantier sur site · **Écrit par** : Audit technique
> Anciennement nommé « Audit » / « Audit chantier PC ». Renommé **Audit technique** (V16).

```javascript
{
  agences: [ {
    id, nom /* ← lu (match agence) */, ville,
    audits: [ {
      id, date:"YYYY-MM-DD",
      corps: [ {
        code, label,
        note: number|null,                 // 0–5  ← lu
        ecart: "urgent"|"mineur"|"corrige"|"conseil"|"nvu",   // ← lu
        rectifStatus: "en_attente"|"corrige",                 // ← lu
        commentaire, photos, ...
      } ]
    } ]
  } ]
}
```
**KPI portail** :
- Note = moyenne des moyennes par audit (fonction `avgA` : pour chaque audit, moyenne des `corps[].note` non nuls ; puis moyenne sur les audits). **Échelle 0–5.**
- Écarts à reprendre = nombre de `corps` où `ecart === "urgent"` ET `rectifStatus !== "corrige"`.

**Accès** : ouverture de l'app réservée à l'**Animateur** (nav). Les KPI restent visibles en vue Réseau (`kpiPublic`) et dans le dashboard de l'agence concernée. Le franchisé/conducteur peut ouvrir l'audit depuis son dashboard via `openEmbedded(...,'R')` (lecture).

---

### Audit commerce · `fnet:data:v1`
**Rôle** : suivi commercial des agences (signatures, contacts, notes) · **Écrit par** : Audit commerce
> 6e app, ajoutée en V16. Anciennement appelée « Audit réseau ».

```javascript
{
  version: 2,
  agencies: [ {
    id, name /* ← lu (match agence) */,
    audits: [ {
      id, date:"YYYY-MM-DD", status,
      leaves: {
        "cli.signatures":      { rows:[ { empId, val:number, note:number /*0–10*/, ... } ] }, // ← lu
        "cli.contact.entrant": { rows:[ ... ] },   // ← lu (contacts)
        "cli.contact.traite":  { rows:[ ... ] },   // ← lu (transfo)
        "cli.ccmi":            { rows:[ ... ] },
        ...
      }
    } ],
    objectives: { signatures:number /* ← lu */, ... },
    employees: [ ... ]
  } ],
  settings: { noteThreshold: 5 /* ← lu */, threshold: 0.8 }
}
```
**Helper de référence** : `leafTotal(audit, id)` = somme des `leaves[id].rows[].val`.

**KPI portail (vue Réseau, `kpiPublic`, mois en cours)** :
- Signatures / objectif réseau = Σ signatures / Σ `objectives.signatures` (%).
- Agences auditées = nombre d'agences avec ≥ 1 audit ce mois.
- Agences en difficulté = note moyenne mensuelle < `settings.noteThreshold` (/10).
- Taux de transfo. = moyenne réseau des (signatures / contacts traités).

**KPI dashboard agence** : Note /10 (moyenne année), Contacts entrants (année), Ventes/signatures (mois en cours), Ventes/signatures (année civile), Objectif signatures/mois.

**Accès** : ouverture réservée à l'**Animateur** (nav). KPI visibles en vue Réseau et dans le dashboard de l'agence. Franchisé et Commercial peuvent ouvrir leur audit commerce depuis leur dashboard via `openEmbedded(...,'R')`.

---

### Chiffrage · plusieurs clés

#### `chiffrage:mes_projets:v1` (lu)
```javascript
[ {
    id, date:"ISO string" /* ← lu */, nom, ref,
    usine:"boisboreal"|"cobs"|"sicob"|"imaj"|"savare"|"lowall", usineLabel,
    total:number /* ← lu (dashboards) */,
    agence:string /* ← lu (depuis naturea_active_user) */,
    user_name, values:{...}, lines:[ {label,detail,amount} ]
} ]
```

#### `chiffrage:tarifs_history:v1` (lu)
```javascript
[ {
    id, date_import:"ISO string" /* ← lu */, filename, usine, devis_num, devis_date,
    client, total_ht,
    postes:[ { label_pdf, unite, qte, pu, total, mapped,
               ancien_pu, delta_pct:number|null /* ← lu */, applique:boolean /* ← lu */ } ]
} ]
```

#### `chiffrage_overrides_v1`, `chiffrage_form_overrides_v1`, `chiffrage_custom_postes_v1` (internes app, NON lus)
Personnalisations libellés/prix, hints de formulaire, postes créés à la volée.

#### `naturea_active_user` (écrit par le PORTAIL, lu par Chiffrage)
```javascript
{ name, agence, role }
```
⚠️ Gérée par le portail (login/logout). Chiffrage la lit pour tagger les projets avec l'agence du user. **Ne pas écrire cette clé depuis une app.** Hors portail → fallback `agence:"(siège)"`.

**KPI portail** :
- Vue Réseau : Devis brouillons / Sur 7j / Agences actives (/17) / Var. tarifs 30j (moyenne des `delta_pct` où `applique === true`).
- Dashboard agence (conducteur/commercial) : Devis chiffrés / Ce mois / Montant HT total — filtrés sur `agence`.

---

## Tableaux de bord par rôle (portail V16)

Le portail affiche, sur la page d'accueil, un tableau de bord propre au rôle connecté, **filtré sur l'agence attribuée** (`currentUser.franchise`). Le rapprochement agence se fait par **nom normalisé** (minuscules, sans accents/espaces) entre `currentUser.franchise` et le nom d'agence stocké dans chaque app (`agences[].nom`, `agencies[].name`, `ossature_orders[].franchise`, `chiffrage…agence`).

| Rôle | Cartes du dashboard | Ouverture depuis le dashboard |
|---|---|---|
| Franchisé | Audit technique · Audit commerce · Ossature | les 3 (audits via `openEmbedded`) |
| Conducteur travaux | Ossature · Chiffrage · Audit technique | Ossature, Chiffrage (audit = indicateurs seuls) |
| Commercial | Chiffrage · Audit commerce | Chiffrage, Audit commerce |

> Si le nom de l'agence du user ne correspond à aucune donnée dans une app, la carte affiche « Agence non reliée ».
>
> **Limite connue** : ouvrir une app depuis le dashboard donne accès à l'app complète (toutes agences). Le cloisonnement « une seule agence » à l'intérieur de chaque app n'est pas encore implémenté.

---

## RÔLES & permissions (objet `PERMS` du portail)

7 rôles. Valeurs par app : `null` (pas d'accès) · `"R"` · `"RW"` · `"ADMIN"`.

| Rôle | RESEAU | CODIR | RECRUT | OSSATURE | AUDIT | AUDIT_COM | CHIFFRAGE | ADMIN |
|---|---|---|---|---|---|---|---|---|
| Animateur | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN |
| Codir | R | RW | RW | R | null | null | R | null |
| Franchisé | null | null | null | RW | null | null | RW | null |
| Commercial | null | null | null | R | null | null | RW | null |
| Conducteur travaux | null | null | null | RW | null | null | RW | null |
| Assistant·e admin | … | … | … | … | … | … | … | … |
| Dessinateur / BE | … | … | … | … | … | … | … | … |

> AUDIT et AUDIT_COM = `null` pour tous sauf Animateur (ouverture). Les KPI restent visibles via `kpiPublic` (vue Réseau) et via les dashboards par rôle (lecture portail, sans droit d'ouverture de l'app).

**Comptes de test** (page login) : Animateur, Codir, Franchisé, Commercial, Conducteur de travaux.

**Cible (non finalisée)** : gestion de ~90 utilisateurs individuels, permissions par utilisateur, auth par PIN, onglet admin réservé Animateur. Migration en 5 étapes (spéc → liste users → UI admin → login PIN → adaptation apps).

---

## Charte graphique (source : Plaquette commerciale V10)

Charte unique appliquée aux 6 apps **et** à la coque du portail (bloc CSS « CHARTE GRAPHIQUE NATURÉA », override `:root` en `!important`) :
- **Vert logo** `#41532A` (accent principal) · vert foncé `#38471F` · vert clair `#EAEFE0`.
- **Orange logo** `#D69362` (accent secondaire) · `#B87648` / `#F6E7D7`.
- Olive/sauge `#839049` · crème `#F2EDE3` · encre `#1E2A18`.
- **Police : Archivo** (substitut libre de **Gopher**, police de marque) chargée via `<link>` Google Fonts ; titres en Archivo 800.

> Couleurs extraites du logo embarqué (vérité de référence). Si une licence Gopher (woff/woff2) est fournie, la charger en `@font-face` à la place d'Archivo.

---

## Règles d'évolution

### LIBRE (sans impact portail)
UI/UX, nouvelles fonctionnalités/écrans, refonte du code interne, renommage de variables internes, couleurs/animations, ajout de champs optionnels — **tant que la sortie localStorage garde la même forme**.

### CASSE le portail (à coordonner)
- Renommer une clé localStorage.
- Renommer/supprimer un champ marqué `← lu` ci-dessus (ex. `statut` ossature, `corps[].note/ecart/rectifStatus`, `leaves` audit commerce, `franchise`/`agence`/`name`/`nom`).
- Changer le type d'un champ lu.

### Procédure si tu dois casser le contrat
1. Documenter dans le projet de l'app. 2. Bumper la version de clé (`…:v1` → `…:v2`) + migration des données. 3. Mettre à jour CE contrat dans **tous** les projets. 4. Mettre à jour la fonction `calc…KPI()` / les fonctions de dashboard du portail.

---

## Dépendances inter-apps
Aucune dépendance directe entre apps. Seul le portail agrège. Exception : Chiffrage lit `naturea_active_user` (écrit par le portail).

---

## Versions actuelles (au 4 juin 2026)

| Composant | Version | Fichier |
|---|---|---|
| Portail | V16 (6 apps, dashboards par rôle, charte) | `portail-naturea_V16.html` |
| CODIR | charte Naturéa | `codir-app.html` |
| Recrutement | charte Naturéa | `recrutement-app.html` |
| Ossature track | charte Naturéa | `ossature-app.html` |
| Audit technique | charte Naturéa | `audit-technique.html` |
| Chiffrage | charte Naturéa | `chiffrage-app.html` |
| Audit commerce | charte Naturéa (6e app) | `audit-commerce.html` |

---

## Workflow type pour modifier une app
1. Modifier l'app (standalone) avec Claude. 2. Récupérer et tester le fichier en standalone. 3. Dans le projet « Portail », fournir la nouvelle version → Claude l'encode en base64 et la réinjecte dans `APP_HTML_B64.{SLOT}`. 4. Re-télécharger le portail. 5. Tester les KPI (vue Réseau + dashboards par rôle).

> Si un KPI tombe à 0 / `—` après mise à jour : la clé ou la structure a probablement changé. Comparer avec ce contrat.
