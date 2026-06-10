/* eslint-disable */
// @ts-nocheck
export const OUINON = [['Oui', 'Oui'], ['Non', 'Non']] as const;

export const QFORM = [
 {t:'🛡️ Garanties souhaitées', help:"Cochez la ou les garanties envisagées (les assurances construction ne se souscrivent pas sans garantie financière).", f:[
   {k:'g_livraison',l:'Garantie financière de livraison à prix et délais convenus',type:'check'},
   {k:'g_achevement',l:"Garantie financière d'achèvement",type:'check'},
   {k:'g_bonnefin',l:'Garantie de bonne fin',type:'check'},
   {k:'g_acompte',l:"Garantie de remboursement d'acompte",type:'check'},
   {k:'g_packco',l:"Assurance construction (RC pro / RC décennale / RC exploitation / Dommages chantier / Dommages-ouvrage)",type:'check'},
   {k:'g_cnr',l:'Garantie CNR (constructeur non réalisateur) pour porteur de VEFA',type:'check'},
 ]},

 {t:"🏢 Identité de l'entreprise", f:[
   {k:'soc_creee',l:'Société déjà créée ?',type:'radio',opts:[['Oui','Oui'],['En cours','En cours de création'],['Non','Non, pas encore']]},
   {k:'rs',l:'Raison sociale',type:'text'},
   {k:'enseigne',l:'Enseigne / marque commerciale',type:'text'},
   {k:'siren',l:'N° SIREN',type:'text'},
   {k:'ape',l:'Code APE',type:'text'},
   {k:'tva',l:'N° TVA intracommunautaire',type:'text'},
   {k:'forme',l:'Forme juridique',type:'text'},
   {k:'date_creation',l:'Date de création',type:'text',ph:'JJ/MM/AAAA'},
   {k:'capital',l:'Capital social (€)',type:'num'},
   {k:'cloture',l:'Date de clôture des exercices',type:'text',ph:'JJ/MM'},
   {k:'objet',l:'Objet social',type:'area'},
   {k:'adresse',l:'Adresse du siège social',type:'text'},
   {k:'cp',l:'Code postal',type:'text'},
   {k:'ville',l:'Ville',type:'text'},
   {k:'tel',l:'Téléphone',type:'text'},
   {k:'portable',l:'Portable',type:'text'},
   {k:'email',l:'Email',type:'text'},
   {k:'site',l:'Site internet',type:'text'},
   {k:'conv_fin',l:'N° de convention financière (éventuel)',type:'text'},
 ]},

 {t:'👥 Répartition du capital & bénéficiaires effectifs', help:"Personnes détenant directement ou indirectement plus de 25 % du capital ou des droits de vote.", f:(()=>{
   const a=[]; for(let i=1;i<=5;i++){ a.push({k:'sub_cap'+i,l:'Associé / actionnaire '+i,type:'sub'});
     a.push({k:'cap'+i+'_nom',l:'Nom et prénom',type:'text'});
     a.push({k:'cap'+i+'_part',l:'Montant ou % détenu',type:'text'});
     a.push({k:'cap'+i+'_be',l:'Bénéficiaire effectif ?',type:'radio',opts:OUINON});
     a.push({k:'cap'+i+'_naiss',l:'Date de naissance',type:'text',ph:'JJ/MM/AAAA'});
     a.push({k:'cap'+i+'_lieu',l:'Lieu de naissance',type:'text'});
   } return a;
 })()},

 {t:'🧑\u200d💼 Effectifs / organigramme', f:[
   {k:'eff_global',l:'Effectif global salarié',type:'num'},
   {k:'sub_eff',l:'Détail par service (nombre)',type:'sub'},
   {k:'eff_direction',l:'Direction',type:'num'},
   {k:'eff_admin',l:'Administratifs',type:'num'},
   {k:'eff_commercial',l:'Commerciaux',type:'num'},
   {k:'eff_commercial_indep',l:'dont indépendants',type:'num'},
   {k:'eff_bet',l:"Bureau d'études technique (BET)",type:'num'},
   {k:'eff_conducteurs',l:'Conducteurs de travaux',type:'num'},
   {k:'eff_ouvriers',l:'Ouvriers / productifs',type:'num'},
   {k:'salaires_n1',l:'Salaires bruts ouvriers N-1 (€)',type:'num'},
   {k:'salaires_n2',l:'Salaires bruts ouvriers N-2 (€)',type:'num'},
 ]},

 {t:'👤 Dirigeant principal', help:"À dupliquer hors appli pour chaque personne participant aux décisions.", f:[
   {k:'dir_nom',l:'Nom',type:'text'},
   {k:'dir_prenoms',l:'Prénom(s)',type:'text'},
   {k:'dir_adresse',l:'Adresse personnelle',type:'text'},
   {k:'dir_cp',l:'Code postal',type:'text'},
   {k:'dir_ville',l:'Ville',type:'text'},
   {k:'dir_mobile',l:'Téléphone mobile',type:'text'},
   {k:'dir_email',l:'Email professionnel',type:'text'},
   {k:'dir_ne_le',l:'Né(e) le',type:'text',ph:'JJ/MM/AAAA'},
   {k:'dir_ne_a',l:'à (lieu)',type:'text'},
   {k:'dir_fonction',l:"Fonction dans l'entreprise",type:'text'},
   {k:'dir_depuis',l:'Depuis le',type:'text',ph:'JJ/MM/AAAA'},
   {k:'dir_anciennete',l:'Ancienneté dans la profession',type:'text'},
   {k:'dir_qualif',l:'Qualification professionnelle',type:'text'},
   {k:'dir_diplomes',l:'Diplôme(s) obtenu(s)',type:'text'},
   {k:'dir_fonctions_prec',l:'Fonctions précédentes (employeurs, villes)',type:'area'},
   {k:'dir_autres',l:"Fonctions dans d'autres entreprises ?",type:'radio',opts:OUINON},
   {k:'dir_autres_detail',l:'Si oui, lesquelles ?',type:'area'},
 ]},

 {t:'🧾 Conseils externes', f:[
   {k:'sub_ec',l:'Expert-comptable',type:'sub'},
   {k:'ec_nom',l:'Nom & prénom',type:'text'},
   {k:'ec_tel',l:'Téléphone',type:'text'},
   {k:'ec_email',l:'Email',type:'text'},
   {k:'ec_adresse',l:'Adresse',type:'text'},
   {k:'ec_cpville',l:'Code postal / ville',type:'text'},
   {k:'sub_cac',l:'Commissaire aux comptes',type:'sub'},
   {k:'cac_nom',l:'Nom & prénom',type:'text'},
   {k:'cac_tel',l:'Téléphone',type:'text'},
   {k:'cac_email',l:'Email',type:'text'},
   {k:'cac_adresse',l:'Adresse',type:'text'},
   {k:'cac_cpville',l:'Code postal / ville',type:'text'},
 ]},

 {t:'🏷️ Adhésions & labels', f:[
   {k:'adh_orgpro',l:'Adhésion à une organisation professionnelle ?',type:'radio',opts:OUINON},
   {k:'adh_orgpro_nom',l:'Si oui, laquelle / lesquelles ?',type:'text'},
   {k:'marque_nf',l:'Titulaire de la marque NF ?',type:'radio',opts:OUINON},
   {k:'adh_qualite',l:'Adhésion à une organisation qualité ?',type:'radio',opts:OUINON},
   {k:'adh_qualite_nom',l:'Si oui, laquelle ?',type:'text'},
   {k:'adh_franchise',l:'Adhésion à une franchise ?',type:'radio',opts:OUINON},
   {k:'adh_franchise_nom',l:'Si oui, laquelle ?',type:'text',ph:'Réseau Naturéa'},
   {k:'relations',l:'Relations privilégiées avec une autre société ?',type:'radio',opts:OUINON},
   {k:'relations_detail',l:"Si oui, raison sociale et secteur d'activité",type:'area'},
 ]},

 {t:"📊 Activité & organisation", help:"Répartition du chiffre d'affaires par secteur (%).", f:[
   {k:'ca_mi_ccmi',l:'Maisons individuelles — contrats de construction (CCMI) %',type:'num'},
   {k:'ca_mi_vefa',l:'Maisons individuelles — VEFA %',type:'num'},
   {k:'ca_mi_marche',l:'Maisons individuelles — marché de travaux %',type:'num'},
   {k:'ca_renovation',l:'Rénovation, etc. %',type:'num'},
   {k:'ca_batiments',l:'Bâtiments industriels / commerciaux %',type:'num'},
   {k:'ca_tp',l:'Travaux publics, etc. %',type:'num'},
   {k:'sub_promo',l:'Autres activités',type:'sub'},
   {k:'op_vefa',l:'Opérations de promotion ou VEFA ?',type:'radio',opts:OUINON},
   {k:'op_vefa_pct',l:'Si oui, % du CA du dernier exercice',type:'num'},
   {k:'autres_ouvrages',l:'Ouvrages autres que maisons individuelles ?',type:'radio',opts:OUINON},
   {k:'autres_ouvrages_detail',l:'Si oui, nature et % du CA',type:'text'},
   {k:'autres_travaux',l:'Travaux autres que construction neuve ?',type:'radio',opts:OUINON},
   {k:'autres_travaux_detail',l:'Si oui, lesquels et % du CA',type:'text'},
 ]},

 {t:'🧱 Technique de construction', help:"Répartition de la technique employée (%).", f:[
   {k:'tech_trad',l:'Traditionnelle %',type:'num'},
   {k:'tech_bois',l:'Bois %',type:'num'},
   {k:'tech_autre',l:'Autre %',type:'num'},
   {k:'tech_autre_desc',l:'Si autre, descriptif du mode constructif',type:'area'},
 ]},

 {t:'🔗 Sous-traitance & conception', f:[
   {k:'st_mi',l:'Sous-traitance des maisons individuelles',type:'radio',opts:[['100%','100 %'],['Partielle','Partielle'],['Aucune','Aucune']]},
   {k:'st_mi_pct',l:'Si partielle, % sous-traité',type:'num'},
   {k:'st_nature',l:'Nature des travaux sous-traités',type:'area'},
   {k:'gps',l:'Garantie de paiement sous-traitant ?',type:'radio',opts:OUINON},
   {k:'gps_org',l:'Si oui, auprès de quel organisme ?',type:'text'},
   {k:'plans',l:'Fournissez-vous les plans ?',type:'radio',opts:OUINON},
   {k:'plans_systeme',l:'Si oui, quel système informatique ?',type:'text'},
 ]},

 {t:'⚙️ Gestion (réalisée par)', help:"Pour chaque fonction, indiquez le mode de réalisation.", f:(()=>{
   const G=[['gest_commercial','Service commercial'],['gest_compta','Comptabilité'],['gest_be','Bureau d\'étude (conception)'],['gest_tech','Services techniques (coordination)'],['gest_sav','Service après-vente']];
   return G.map(([k,l])=>({k,l,type:'sel',opts:['Salariés','Sous-traité','Mixte']})).concat([{k:'gest_be_diplome',l:'BET — diplôme',type:'text'}]);
 })()},

 {t:'🔬 Études techniques spécialisées', help:"Réalisées par l'entreprise ou sous-traitées (préciser le sous-traitant).", f:(()=>{
   const E=[['et_implantation','Implantation'],['et_sol','Sol'],['et_beton','Béton'],['et_thermique','Thermique'],['et_sismique','Sismique']];
   const a=[]; E.forEach(([k,l])=>{ a.push({k,l,type:'sel',opts:['Entreprise','Sous-traité']}); a.push({k:k+'_st',l:l+' — nom/adresse sous-traitant',type:'text'}); }); return a;
 })()},

 {t:'📦 Matériaux', f:(()=>{
   const M=[['mat_parpaings','Parpaings'],['mat_charpente','Charpente'],['mat_couverture','Couverture'],['mat_menuiserie','Menuiserie'],['mat_sanitaire','Sanitaire'],['mat_carrelages','Carrelages']];
   return M.map(([k,l])=>({k,l,type:'sel',opts:['Achetés par l\'entreprise','Fournis par le réalisateur','Fabriqués par l\'entreprise']}));
 })()},

 {t:'🛠️ Réalisation par lot', f:(()=>{
   const R=[['real_maconnerie','Maçonnerie'],['real_charpente','Charpente'],['real_couverture','Couverture'],['real_menuiserie','Menuiserie'],['real_plomberie','Plomberie'],['real_carrelages','Carrelages'],['real_autres','Autres lots']];
   return R.map(([k,l])=>({k,l,type:'sel',opts:['Totalement salariés','Partiellement salariés','Sous-traité']}));
 })()},

 {t:'💶 Informations comptables & financières', f:[
   {k:'marge_moy',l:'Marge brute moyenne pratiquée %',type:'num'},
   {k:'marge_min',l:'Marge brute minimale acceptée %',type:'num'},
   {k:'prix_revient_base',l:'Base de calcul du prix de revient & par qui',type:'area'},
   {k:'methode',l:'Méthode comptable des travaux en cours',type:'radio',opts:[['Achèvement','À l\'achèvement'],['Avancement','À l\'avancement']]},
   {k:'methode_detail',l:'Détail du calcul des travaux en cours au bilan',type:'area'},
   {k:'valo_carnet',l:'Valorisez-vous votre carnet de commandes ?',type:'radio',opts:OUINON},
   {k:'valo_comment',l:'Si oui, comment ?',type:'area'},
 ]},

 {t:'🏪 Activité commerciale & gamme de prix', f:[
   {k:'zone',l:"Zone d'activité de l'entreprise",type:'text'},
   {k:'agences',l:'Agences / bureaux (nombre & localisation)',type:'area'},
   {k:'temoins',l:'Maisons témoins (nombre & localisation)',type:'area'},
   {k:'remu_salaries',l:'Rémunération commerciaux salariés',type:'text'},
   {k:'remu_indep',l:'Rémunération commerciaux indépendants',type:'text'},
   {k:'prix_moyen',l:'Prix moyen de vente (K€ TTC)',type:'num'},
   {k:'prix_m2',l:'Prix de vente pratiqué par m² habitable',type:'text'},
   {k:'rep_inf150',l:'Ventes < 150 K€ TTC (%)',type:'num'},
   {k:'rep_150_300',l:'Ventes 150 à 300 K€ TTC (%)',type:'num'},
   {k:'rep_sup300',l:'Ventes > 300 K€ TTC (%)',type:'num'},
 ]},

 {t:'📝 Contrat CCMI & délais', f:[
   {k:'acompte',l:'Acompte demandé à la signature ?',type:'radio',opts:OUINON},
   {k:'acompte_pct',l:'Si oui, quel % ?',type:'num'},
   {k:'delai_vente_permis',l:'Délai vente → permis (mois)',type:'num'},
   {k:'delai_permis_ouv',l:'Délai permis → ouverture (mois)',type:'num'},
   {k:'delai_admin',l:'Délai administratif signature → ouverture chantier (mois)',type:'num'},
   {k:'duree_constr',l:'Durée de la construction (mois)',type:'num'},
   {k:'signe_controle',l:'Qui signe et contrôle le contrat définitif ?',type:'text'},
   {k:'do_clients',l:'Souscrivez-vous la Dommages-Ouvrage pour vos clients ?',type:'radio',opts:OUINON},
   {k:'do_assureurs',l:'Si oui, nom du/des assureur(s)',type:'text'},
   {k:'do_refacture',l:'Refacturez-vous cette garantie ?',type:'radio',opts:OUINON},
   {k:'do_prix',l:'Si oui, à quel prix (€) ?',type:'num'},
 ]},

 {t:'📈 Activité chiffrée (N-2 / N-1 / N / en cours)', help:"En nombre de maisons, sauf 'ventes en valeur'.", f:(()=>{
   const ROWS=[['ventes','Ventes acceptées'],['annulees','Ventes annulées'],['ouvertures','Ouvertures de chantiers'],['livraisons','Livraisons'],['prixmoy','Prix de vente moyen TTC (€)'],['ventes_val','Ventes en valeur (K€)']];
   const COLS=[['n2','N-2'],['n1','N-1'],['n','N'],['ec','En cours']];
   const a=[]; ROWS.forEach(([rk,rl])=>{ a.push({k:'sub_'+rk,l:rl,type:'sub'}); COLS.forEach(([ck,cl])=>a.push({k:'act_'+rk+'_'+ck,l:cl,type:rk==='prixmoy'?'num':'num'})); }); return a;
 })()},

 {t:'📚 Carnet de commandes (à la date du dossier)', f:[
   {k:'sub_cc_ccmi',l:'CCMI',type:'sub'},
   {k:'cc_ccmi_nb',l:'Maisons signées non commencées — nombre',type:'num'},
   {k:'cc_ccmi_val',l:'Maisons signées non commencées — valeur (K€)',type:'num'},
   {k:'cc_chantiers_nb',l:'Chantiers en cours — nombre',type:'num'},
   {k:'cc_chantiers_val',l:'Chantiers en cours — valeur (K€)',type:'num'},
   {k:'sub_cc_autres',l:'Autres activités',type:'sub'},
   {k:'cc_autres_signes_val',l:'Chantiers signés non commencés — valeur (K€)',type:'num'},
   {k:'cc_autres_encours_val',l:'Chantiers en cours — valeur (K€)',type:'num'},
   {k:'sub_mnc',l:'Maisons non commencées (détail)',type:'sub'},
   {k:'mnc_purges_nb',l:'Délais recours tiers purgés — nombre',type:'num'},
   {k:'mnc_purges_prix',l:'Délais recours tiers purgés — prix vente HT (€)',type:'num'},
   {k:'mnc_pc_obtenu_nb',l:'PC obtenu, recours tiers en cours — nombre',type:'num'},
   {k:'mnc_pc_obtenu_prix',l:'PC obtenu, recours tiers en cours — prix vente HT (€)',type:'num'},
   {k:'mnc_pc_non_nb',l:'PC non obtenu — nombre',type:'num'},
   {k:'mnc_pc_non_prix',l:'PC non obtenu — prix vente HT (€)',type:'num'},
 ]},

 {t:'🛡️ Assurances & garanties actuelles', f:[
   {k:'ga_deja',l:'Bénéficiez-vous déjà d\'une garantie de livraison ?',type:'radio',opts:OUINON},
   {k:'ga_org',l:'Si oui, auprès de quel(s) organisme(s) ?',type:'text'},
   {k:'ass_assureur',l:'Nom de votre assureur',type:'text'},
   {k:'sub_ass',l:'Contrats en cours (compagnie / n° / depuis)',type:'sub'},
   {k:'ass_rcpro',l:'RC professionnelle',type:'text',ph:'compagnie · n° · depuis'},
   {k:'ass_rcdec',l:'RC décennale',type:'text',ph:'compagnie · n° · depuis'},
   {k:'ass_gflpdc',l:'Garantie financière de livraison',type:'text',ph:'compagnie · n° · depuis'},
   {k:'ass_gps',l:'Garantie paiement sous-traitants',type:'text',ph:'compagnie · n° · depuis'},
   {k:'ass_pj',l:'Protection juridique',type:'text',ph:'compagnie · n° · depuis'},
 ]},

 {t:'🏦 Banques', f:[
   {k:'sub_bq1',l:'Banque n°1',type:'sub'},
   {k:'bq1_nom',l:'Nom',type:'text'},
   {k:'bq1_adresse',l:"Adresse de l'agence",type:'text'},
   {k:'bq1_decouvert',l:'Lignes court terme / autorisation de découvert (€)',type:'num'},
   {k:'sub_bq2',l:'Banque n°2',type:'sub'},
   {k:'bq2_nom',l:'Nom',type:'text'},
   {k:'bq2_adresse',l:"Adresse de l'agence",type:'text'},
   {k:'bq2_decouvert',l:'Lignes court terme / autorisation de découvert (€)',type:'num'},
 ]},

 {t:'🔧 Service après-vente', f:[
   {k:'sav_orga',l:'Avez-vous une organisation particulière ?',type:'area'},
   {k:'sav_cout',l:'Coût en % du CA hors taxes',type:'num'},
 ]},
] as const;

export function qFields(): Array<{ k: string; l: string; type: string }> {
  const fields: Array<{ k: string; l: string; type: string }> = [];
  QFORM.forEach((section) => {
    section.f.forEach((field) => {
      if (field.type !== 'sub') fields.push(field);
    });
  });
  return fields;
}
