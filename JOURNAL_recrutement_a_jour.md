# JOURNAL DE BORD — Naturéa (multi-projets)

> Une entrée par modification significative. Date au format YYYY-MM-DD.
> Préfixe `[Projet]` au début du titre pour identifier l'app concernée.
> Entrées triées de la plus récente à la plus ancienne.

---

## 2026-06-04 — [Portail] Tableaux de bord par rôle + comptes de test

**Demande** : un tableau de bord sur l'accueil pour franchisé, conducteur de travaux et commercial, avec des indicateurs de l'agence du user ; gérer les accès ; ajouter le compte test conducteur.

**Réalisé** :
- **Dashboard par rôle** (`renderFranchiseDash`) affiché sur `view-home`, filtré sur l'agence attribuée (`currentUser.franchise`), rapprochement par **nom normalisé** (sans accents/casse/espaces) dans chaque app.
  - **Franchisé** : Audit technique (note /5, écarts à reprendre, audits) · Audit commerce (note /10, contacts année, ventes mois, ventes année) · Ossature (devis demandés/envoyés/commandes/expéditions). Ouverture des 3 (audits via `openEmbedded(...,'R')`).
  - **Conducteur travaux** : Ossature · Chiffrage (devis chiffrés, ce mois, montant HT total) · Audit technique (indicateurs seuls). Accès Chiffrage ajouté (`CHIFFRAGE:"RW"`).
  - **Commercial** : Chiffrage · Audit commerce (ouvrable). Carte Ossature retirée.
- **Fonctions de calcul portail** : `calcFranchiseAuditTech`, `calcFranchiseAuditCom`, `calcFranchiseOssature`, `calcFranchiseChiffrage` (lecture seule des clés `naturea_pc_v1`, `fnet:data:v1`, `ossature_orders`, `chiffrage:mes_projets:v1`).
- **Comptes de test** : ajout de « Conducteur de travaux » (`conducteur.a@naturea.fr` / `cdt2026!`) sur la page login.

**Fichiers modifiés** : `portail-naturea_V16.html`

**Impact contrat** : aucune nouvelle clé. Le portail **lit** désormais aussi `naturea_pc_v1`, `fnet:data:v1`, `ossature_orders`, `chiffrage:mes_projets:v1` pour les dashboards (en plus de la vue Réseau). Documenté dans CONTRAT_INTERFACES v2.0.

**Tests effectués** : `node --check` du script portail à chaque étape ; round-trip base64 des apps réinjectées.

**À surveiller** :
- Le rapprochement agence dépend du **nom** : avec le compte test « Franchise A » (qui n'existe dans aucune app) les cartes affichent « Agence non reliée ». Mettre un nom d'agence réel sur le user pour voir les chiffres.
- Ouvrir une app depuis le dashboard donne accès à l'app **complète** (toutes agences). Le cloisonnement par agence à l'intérieur des apps reste à faire.
- Périodes : ventes/contacts en année civile, ventes du mois = mois en cours.

---

## 2026-06-04 — [Charte] Charte graphique unifiée Naturéa (6 apps + portail)

**Demande** : uniformiser la charte graphique des apps à partir de la Plaquette commerciale V10 ; respecter le vert du logo (les verts trop foncés ne convenaient pas) ; corriger les initiales candidats illisibles.

**Réalisé** :
- Couleurs extraites du **logo embarqué** (vérité de référence) : **vert `#41532A`** (accent principal), **orange `#D69362`** (accent secondaire), olive `#839049`, crème `#F2EDE3`, encre `#1E2A18`.
- Police de marque = **Gopher** (logo/titres de la plaquette) → substitut libre **Archivo** chargé via `<link>` Google Fonts, titres en Archivo 800.
- Bloc CSS unique « CHARTE GRAPHIQUE NATURÉA » (override `:root` en `!important`) appliqué aux **6 apps**, mappant l'accent principal de chaque app vers le vert logo et le secondaire vers l'orange logo. Coque du portail alignée sur les mêmes valeurs.
- **Recrutement** : initiales candidats (`.av`) passées en **orange** (texte `#E5965C` sur pastille foncée) — auparavant vert foncé sur fond foncé, illisible.
- Suppression de la police serif Cormorant (hors-marque) posée précédemment sur 4 apps.

**Fichiers modifiés** : `codir-app.html`, `recrutement-app.html`, `ossature-app.html`, `audit-technique.html`, `audit-commerce.html`, `chiffrage-app.html`, `portail-naturea_V16.html` (réinjection base64 des 6 apps).

**Impact contrat** : aucun (purement visuel, aucune clé/structure touchée).

**Tests effectués** : balises `<style>` équilibrées, `<link>` Archivo présent et bloc charte unique par app ; round-trip base64 exact ; `node --check` du portail.

**À surveiller** :
- L'harmonisation force le vert comme accent dominant partout (Ossature était bleu, Recrutement doré, Audit commerce terracotta) — volontaire.
- Si une licence Gopher (woff/woff2) est fournie, basculer d'Archivo vers `@font-face` Gopher.

---

## 2026-06-03 — [Portail] Audit commerce (6e app) + renommage des audits + permissions

**Demande** : ajouter l'app audit commerce comme tuile distincte ; renommer « Audit » → « Audit technique » et « Audit réseau » → « Audit commerce » ; réserver l'ouverture des deux audits aux animateurs tout en gardant leurs KPI visibles en vue Réseau.

**Réalisé** :
- **6e app `AUDIT_COM`** (audit commerce, clé `fnet:data:v1`) : slot `APP_HTML_B64.AUDIT_COM`, bouton nav, entrée `APPS_META`, colonne `PERMS` sur les 7 rôles, carte + KPI dans la vue Réseau.
- **Renommages** : `AUDIT` → « Audit technique », `AUDIT_COM` → « Audit commerce » (nav, tuiles, vue Réseau).
- **Permissions** : `AUDIT` et `AUDIT_COM` = `null` pour tous les rôles **sauf Animateur** (ouverture). Découplage « voir les KPI » / « ouvrir l'app » via un flag `kpiPublic:true` → les KPI restent affichés en vue Réseau même sans droit d'ouverture.
- **KPI vue Réseau audit commerce** (mois en cours) : Signatures / objectif réseau (%), Agences auditées, Agences en difficulté (note moyenne < `settings.noteThreshold`), Taux de transfo. (moyenne réseau).
- Helper de référence `leafTotal(audit,id)` = somme des `leaves[id].rows[].val` ; transfo = signatures / contacts traités.

**Fichiers modifiés** : `portail-naturea_V16.html` (depuis V15), `audit-commerce.html` (intégrée).

**Impact contrat** : **nouvelle clé lue** `fnet:data:v1` (structure documentée dans CONTRAT_INTERFACES v2.0). Clé `naturea_pc_v1` inchangée mais précisions ajoutées (note **0–5**, champs `ecart` et `rectifStatus`).

**Tests effectués** : `node --check` du script portail ; round-trip base64 des 6 apps.

**À surveiller** :
- KPI audit commerce calculés sur le **mois en cours** (cohérent avec la vue réseau de l'app). En début de mois, « Aucune donnée » tant qu'aucun audit n'est saisi.
- Le contrat d'interfaces V15 décrivait des statuts Ossature obsolètes (« À planifier/Posé… ») : corrigés en V2.0 vers les 4 statuts réels (`Devis demandé` / `Devis envoyé` / `Commande confirmée` / `Expédition validée`).

---

## 2026-06-02 — [Chiffrage] Création de postes à la volée pendant l'import

**Demande** : pendant l'import d'un PDF, si une ligne n'est pas mappée automatiquement à un poste existant, pouvoir soit créer un nouveau poste, soit rattacher la ligne à un poste existant — sans repasser par moi (Claude) pour patcher le code.

**Réalisé** :
- **Nouvelle clé localStorage** `chiffrage_custom_postes_v1` (interne — non lue par le portail, aucun impact contrat).
- **Structure** d'un poste custom :
  ```json
  {
    "label_user": "Pose extérieure",
    "label_pdf": "Pose murs extérieure",
    "tooltip": "...",
    "unite": "€/m²",
    "moyen": 35, "min": 35, "max": 35, "n": 1,
    "fiabilite": "faible",
    "visible": true, "custom": true,
    "created_at": "ISO date",
    "form_field": { "field_id": "...", "type": "surface", "section": "🏠 Charpente", "unit": "m²", "hint": "" }
  }
  ```
- **Helpers data** : `loadCustomPostes`, `saveCustomPostes`, `getCustomPoste`, `isCustomPoste`, `addCustomPoste`, `deleteCustomPoste`, `getEffectiveFieldMap`, `buildEffectiveSchema`, `getCustomFieldsForSection`, `getUsineSections`, `generatePosteCode` (slug), `generateFieldId`, `deduceMappingType`, `normalizeUniteForDisplay`.
- **Patches sur les getters** : `getPoste`, `getPrixCalcule`, `setOverride` fonctionnent en transparence avec les postes custom (fallback REFS → CUSTOM_POSTES).
- **renderForm** : injection auto des champs custom à la fin de la section où ils sont rangés (via `buildEffectiveSchema`).
- **calcRecap** : utilise `getEffectiveFieldMap` pour totaliser les valeurs saisies sur les champs custom.
- **suggestMapping** : la recherche par similarité scanne maintenant aussi les postes custom (utile si un nouveau PDF arrive avec un libellé proche d'un poste créé précédemment).
- **Module import** :
  - Le dropdown "Mappé sur" affiche un **optgroup "➕ Postes personnalisés"** sous les postes natifs.
  - Sur chaque ligne **non mappée** (et si l'usine est sélectionnée) : bouton **"➕ Créer ce poste / rattacher"** qui ouvre une modal.
  - La modal a 2 modes (radio cards) :
    - **Créer** : label, unité (déduite de l'unité PDF), section (dropdown des sections existantes + option "Nouvelle section"), prix unitaire (préfilled depuis le PDF), tooltip optionnel.
    - **Rattacher** : dropdown des postes existants (natifs + custom) pour mapper la ligne sans créer de doublon.
  - À la validation : `addCustomPoste` (mode créer) ou simple mapping (mode rattacher), puis re-render du preview avec la nouvelle ligne mappée.
- **Référentiel & Paramètres** : les postes custom apparaissent avec badge **"perso"** (style sand/terra). Dans Paramètres, bouton **"🗑 Supprimer ce poste perso"** dans le header de la carte. Le label_pdf est affiché en éditable (pictogramme 📝 au lieu de 🔒).
- **Export/Import JSON enrichi** (bouton existant dans Paramètres) :
  - Export inclut désormais `overrides` + `custom_postes` + `form_overrides`. Version 2 → version 3.
  - Import accepte v2 (rétrocompatible) et v3. Toast indique combien de postes perso ont été inclus.
  - Bouton "🔄 Tout réinitialiser" supprime aussi les custom postes (avec confirmation explicite listant ce qui sera perdu).
- **Nouveau composant UI** : système de modal générique réutilisable (`openModal(html)` / `closeModal()`) + CSS modal-overlay/modal-box. ESC ferme la modal.

**Fichiers modifiés** : `chiffrage-app.html` (~193 500 chars, +~25 000 chars).

**Impact contrat** : **aucun**. Les clés `chiffrage:mes_projets:v1` et `chiffrage:tarifs_history:v1` gardent leur structure. Les chiffrages sauvegardés qui utilisent un champ custom stockent simplement la valeur saisie sous le `field_id` du custom (idem qu'un champ natif). Si le poste custom est supprimé après coup, la valeur reste dans le JSON sauvegardé mais n'est plus interprétée (pas de plantage, juste ignorée).

**Tests automatisés effectués** :
- Création / lecture / suppression d'un poste custom ✓
- Fusion FORM_SCHEMAS natif (14 items) + custom = 15 items ✓
- Fusion FIELD_TO_POSTE natif (9) + custom = 10 ✓
- Mapping auto par similarité trouve bien le custom ✓
- Génération de codes uniques (slug avec suffixe `_2`, `_3` si collision) ✓

**À tester manuellement** :
- Drag&drop d'un PDF avec un poste inconnu → bouton "Créer/Rattacher" → modal → création → ligne devient mappée
- Vérifier que le nouveau champ apparaît dans le formulaire d'estimation à la bonne section
- Vérifier que le prix saisi est correctement calculé dans le récap
- Sauvegarder un projet utilisant un champ custom puis le rouvrir
- Exporter le JSON des perso, supprimer le custom, ré-importer → le custom revient
- Cas "Nouvelle section" dans la modal de création
- Cas "Rattacher à un poste existant" (au lieu de créer)

**Limitations connues** :
- Les postes custom comptent toujours `n=1` (pas de stat agrégée sur plusieurs devis pour l'instant). Si tu en crées un et l'utilises sur plusieurs imports, le `moyen` ne s'actualise pas auto — il faut l'éditer manuellement dans Paramètres.
- Le `label_pdf` initial vient du texte du PDF qui a déclenché la création. Si une autre usine utilise un libellé légèrement différent, le mapping auto risque de ne pas matcher → il faudra recréer ou ajuster manuellement (ou utiliser "Rattacher").
- Si tu supprimes un poste custom puis qu'un nouveau PDF arrive avec le même libellé, le mapping ne le retrouvera évidemment pas (le poste est parti). Comportement attendu.

---

## 2026-06-02 — [Recrutement] Cloisonnement vue candidat, questionnaire fusionné assureurs & export PDF

**Demande** : (1) garantir que le bouton "Changer de vue" reste au franchiseur mais soit inaccessible au candidat (contrôle d'accès final via portail dédié) ; (2) remplacer le questionnaire candidat par un dossier unique fusionnant les 2 formulaires assureurs (CEGC + SMABTP/Réseau Naturéa) ; (3) rendre ce dossier imprimable en PDF côté franchiseur uniquement.

**Réalisé** :
- Bouton "Changer de vue" : ajout d'un flag `franchisorSession`. Le bouton n'est visible/actif qu'en session franchiseur (y compris quand il bascule en vue candidat pour accompagner). Une vraie session candidat (ouverte par le portail) le laisse masqué. `doLogout()` sort immédiatement hors session franchiseur (double sécurité). Libellé adaptatif ("Changer de vue" / "Revenir vue franchiseur").
- Questionnaire : ancien format 15 questions (q1–q15) remplacé par un dossier unique de ~150 champs, 20 sections (garanties, identité société, capital/bénéficiaires effectifs, effectifs, dirigeant, conseils externes, adhésions, activité & CA, technique de construction, sous-traitance, gestion, études techniques, matériaux, réalisation par lot, comptable/financier, commercial & prix, contrat CCMI & délais, activité chiffrée N-2/N-1/N, carnet de commandes, assurances actuelles, banques, SAV). Tous les champs facultatifs (un prospect complète progressivement). Architecture pilotée par un schéma unique `QFORM` → génère formulaire, récap lecture seule (champs vides masqués) et sauvegarde.
- Export PDF : bouton "🖨 Imprimer / PDF" sur la ligne questionnaire, visible franchiseur seul + garde dans `printQuest()` (sort si rôle ≠ admin). Ouvre une mise en page autonome (styles intégrés) dans un nouvel onglet → impression navigateur / "Enregistrer en PDF". En-tête avec identité candidat + date de complétion.

**Fichiers modifiés** : `recrutement-app.html`

**Impact contrat** : AUCUN. La clé `fhv3` et les champs `statut`/`date` (lus par le portail pour les KPI Candidats actifs / Nouveaux 7j) sont intacts. Le questionnaire est stocké dans `c.questionnaire`, non lu par le portail → restructuration libre.

**Tests effectués** : validation syntaxe JS (node), vérif absence de résidus q1–q15, cohérence des appels (toggleInlineQuest / editInlineQuest / qHTML / qRecapHTML / printQuest), comptage 20 sections / ~150 champs.

**À surveiller** :
- Les questionnaires déjà saisis en ancien format q1–q15 ne s'affichent plus (format obsolète) → à recréer si besoin.
- Le cloisonnement reste un garde-fou UI tant que tout tourne en HTML+localStorage. Le vrai contrôle d'accès doit venir du portail dédié, qui devra ouvrir l'app candidat avec `franchisorSession=false`.
- Libellés du questionnaire calqués sur le vocabulaire assureur (à adapter au langage candidat si besoin).
- Piste future : export pré-remplissant directement les PDF CEGC / SMABTP depuis les données du dossier.

---

## 2026-06-01 — [Chiffrage] LOWALL : ajout plancher (2 variantes) + poteaux-poutres

**Demande** : intégrer les postes manquants côté LOWALL repérés sur 3 nouveaux PDF (D2026-105, D2026-107, D2026-109).

**Réalisé** :
- 3 nouveaux postes dans `REFS.lowall.postes` :
  - `plancher_45x200` : 80 €/m² (caisson ouvert chevrons 45×200, fourniture seule), n=1, fiabilité faible
  - `plancher_80x220` : 90 €/m² (caisson ouvert chevrons 80×220, fourniture seule), n=1, fiabilité faible
  - `poteaux_poutres` : 1 000 €/m³ (poteaux 160×160 + poutres 140×360/160×400), n=2, fiabilité moyenne
- Mise à jour stats LOWALL : `devis_count` 12→15, `derniere_maj` 2026-05-11
- Recalcul `mob` (isolé) : moy 110.82→110.64, n 11→14
- Recalcul `mob_ouvert` : n 5→6 (D2026-105 avait 46m² à 85€)
- Recalcul `quincaillerie` : n 12→15
- Recalcul `transport` : n 1→4 (présent sur les 3 nouveaux devis)
- Nouvelle section dans `FORM_SCHEMAS.lowall` "🏗️ Plancher & structure" avec 3 champs entre Quincaillerie et Charpente
- 3 mappings ajoutés dans `FIELD_TO_POSTE.lowall` (avec nouveau type `volume` pour poteaux-poutres)
- 3 entrées ajoutées dans `DEVIS_HIST` (D2026-105, -107, -109)
- **Nouveau type de mapping `volume`** dans `calcRecap` (ligne ~1400) : affichage en m³ avec 2 décimales. Le type `surface` continue d'afficher m² avec 1 décimale, le type `unite` affiche "u" avec 0 décimale. Type `volume` réutilisable pour d'autres usines à l'avenir.

**Fichiers modifiés** : `chiffrage-app.html` (5 blocs : REFS, DEVIS_HIST, FORM_SCHEMAS, FIELD_TO_POSTE, calcRecap)

**Impact contrat** : **aucun**. Les clés `chiffrage:mes_projets:v1` et `chiffrage:tarifs_history:v1` ne changent pas de structure. Les anciens projets sauvegardés restent lisibles. Le portail continue de lire `agence`, `date`, `total`, `applique`, `delta_pct` sans modification.

**Tests effectués** : parsing JS OK, structure REFS/FORM_SCHEMAS/FIELD_TO_POSTE cohérente.

**À surveiller** :
- À tester en drag&drop : les 3 PDF doivent être détectés en LOWALL, parser les 5 postes (MOB isolé, plancher, poteaux-poutres, quincaillerie, transport), et mapper auto sur les nouveaux codes
- Si le mapping auto ne match pas "Modules Plancher 80x220 ouvert non isolé" → "plancher_80x220", c'est la similarité de mots qui coince → ajuster `label_pdf`
- Recalculer la moyenne pondérée par surface (et pas arithmétique simple) si tu veux plus de précision — pour l'instant 110.64 = (11×110.82 + 3×110)/14

---

## 2026-05-02 — Initialisation des projets séparés

**Contexte** : passage d'un projet unique à 6 projets Claude (1 par app + 1 portail) pour limiter le volume de contexte par conversation et éviter les compactions de transcript.

**État de référence à cette date** :
- Portail V15 (1 086 601 chars)
- CODIR : VF harmonisée (123 922 chars décodés)
- Recrutement : harmonisée (82 882 chars décodés)
- Ossature : VF harmonisée (236 375 chars décodés)
- Audit : VF harmonisée (61 948 chars décodés)
- Chiffrage : v8 · import PDF (161 258 chars décodés)

**Dernières évolutions du portail** :
- Vue Réseau avec 5 cartes app + KPI agrégés (lecture localStorage)
- Persistance de l'utilisateur connecté via `naturea_active_user`
- KPI Chiffrage : Devis brouillons / Sur 7j / Agences actives /17 / Var. tarifs (30j)

**Dernières évolutions de Chiffrage (v8)** :
- Persistance des chiffrages par agence (étape 1A)
- Module d'import PDF des devis usine (étape 1B) avec :
  - Drag & drop + bouton "Choisir un PDF"
  - Détection auto usine via mots-clés/SIREN (6 usines : SICOB, BoisBoréal, COBS, IMAJ, SAVARE, LOWALL)
  - Parser générique ancré sur la fin de ligne (TVA %), unité optionnelle
  - Mapping auto sur les postes existants (similarité de mots ≥ 50%)
  - Validation case à case + bouton "tout cocher"
  - Historisation dans `chiffrage:tarifs_history:v1`
  - Mode debug avec textarea du texte extrait si 0 postes détectés
- Onglet Import fusionné dans "Historique des devis" (3 sections : import / historique imports / 60 devis sources)

---

## [Modèle d'entrée à copier-coller pour chaque modif]

## YYYY-MM-DD — [Projet] Titre court de la modification

**Demande** : ce qu'on voulait faire
**Réalisé** : ce qui a été fait
**Fichiers modifiés** : liste
**Impact contrat** : aucun / mise à jour de la clé X / nouvelle structure Y
**Tests effectués** : ce qui a été vérifié
**À surveiller** : points d'attention pour les prochaines modifs
