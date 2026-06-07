/* eslint-disable */
import type { AutoFillRule, ComputedFieldResult, UsineKey } from '../chiffrage.models';

type AutoFillRulesStore = Partial<Record<UsineKey, Record<string, AutoFillRule[]>>>;
type ComputedFieldsStore = Partial<
  Record<UsineKey, Record<string, (vals: Record<string, number>) => ComputedFieldResult>>
>;

export const AUTO_FILL_RULES: AutoFillRulesStore = {
  boisboreal:{
    mob_m2:[
      {target:"ite_m2",factor:1.0,label:"= MOB"},
      {target:"laine_m2",factor:0.9,label:"= MOB −10%"},
      {target:"pv_m2",factor:1.0,label:"= MOB"},
      {target:"chargement_m2",factor:1.0,label:"= MOB"},
      {target:"protection_tete_ml",factor:0.7,label:"= MOB −30%"}
    ]
  },
  cobs:{mob_m2:[{target:"ite_m2",factor:1.0,label:"= MOB"},{target:"isolation_m2",factor:0.8,label:"= MOB −20%"}]},
  lowall:{mob_m2:[]}  // quinc_qty géré via COMPUTED_FIELDS (somme mob+ouvert+biosource)
};
export const COMPUTED_FIELDS: ComputedFieldsStore = {
  boisboreal:{
    transport:(vals)=>{
      const mob=vals['mob_m2']||0,plancher=vals['plancher_clt']||0;
      const nb=(mob<141&&plancher===0)?1:2;
      return{value:nb*1268,hint:`${nb} forfait${nb>1?'s':''} × 1 268 €`};
    }
  },
  lowall:{
    quinc_qty:(vals)=>{
      const total=(vals['mob_m2']||0)+(vals['mob_ouvert_m2']||0)+(vals['mob_biosource_m2']||0);
      const totalFmt=total.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
      return{value:Math.round(total*100)/100,hint:`= MOB isolé + ouvert + bio-sourcé (${totalFmt} m²)`};
    }
  }
};
