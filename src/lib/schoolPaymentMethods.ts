export const SCHOOL_PAYMENT_METHODS = [
 {id:"QRIS",channel:"qris",label:"QRIS",logoCode:"QRIS"},
 {id:"VIRTUAL_ACCOUNT_BANK_MANDIRI",channel:"va",label:"Mandiri",logoCode:"MANDIRI"},
 {id:"VIRTUAL_ACCOUNT_BNI",channel:"va",label:"BNI",logoCode:"BNI"},
 {id:"VIRTUAL_ACCOUNT_BRI",channel:"va",label:"BRI",logoCode:"BRI"},
 {id:"VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI",channel:"va",label:"BSI",logoCode:"BSI"},
 {id:"ONLINE_TO_OFFLINE_ALFA",channel:"retail",label:"Alfamart",logoCode:"ALFAMART"},
 {id:"ONLINE_TO_OFFLINE_INDOMARET",channel:"retail",label:"Indomaret",logoCode:"INDOMARET"},
] as const;
export function visibleSchoolMethods(methods: {id:string;channel:string;label:string}[], channels: readonly string[]) {
 return SCHOOL_PAYMENT_METHODS.filter(spec => channels.includes(spec.channel) && methods.some(m => m.id===spec.id && m.channel===spec.channel));
}
