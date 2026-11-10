export const SCHOOL_CHANNELS = ["qris", "va", "retail"] as const;
export const DOKU_METHODS = [
 {id:"QRIS",channel:"qris",label:"QRIS",fee:0},
 {id:"VIRTUAL_ACCOUNT_BCA",channel:"va",label:"BCA",fee:4500},
 {id:"VIRTUAL_ACCOUNT_BANK_MANDIRI",channel:"va",label:"Mandiri",fee:4000},
 {id:"VIRTUAL_ACCOUNT_BNI",channel:"va",label:"BNI",fee:4000},
 {id:"VIRTUAL_ACCOUNT_BRI",channel:"va",label:"BRI",fee:4000},
 {id:"VIRTUAL_ACCOUNT_BANK_CIMB",channel:"va",label:"CIMB Niaga",fee:4000},
 {id:"ONLINE_TO_OFFLINE_ALFA",channel:"retail",label:"Alfamart",fee:5000},
 {id:"ONLINE_TO_OFFLINE_INDOMARET",channel:"retail",label:"Indomaret",fee:6500},
];
export async function schoolPaymentChannels(db: any, schoolId: string): Promise<string[]> {
 const {data,error}=await db.from("school_payment_preferences").select("enabled_channels").eq("school_id",schoolId).maybeSingle();
 if(error)throw new Error("Pengaturan pembayaran sekolah belum tersedia");
 return (data?.enabled_channels ?? [...SCHOOL_CHANNELS]).filter((v:string)=>SCHOOL_CHANNELS.includes(v as any));
}
export async function requireSchoolPaymentChannel(db:any,schoolId:string,channel:string|null){
 const channels=await schoolPaymentChannels(db,schoolId);const selected=channel||channels[0];
 if(!selected||!channels.includes(selected))throw new Error("Metode pembayaran ini dinonaktifkan oleh sekolah");return selected;
}
export async function paymentCostConfig(db:any){
 const {data,error}=await db.from("platform_settings").select("key,value").in("key",["atskolla_admin_fee","doku_merchant_tariffs"]);
 if(error)throw new Error("Tarif pembayaran belum tersedia");const map=Object.fromEntries((data||[]).map((x:any)=>[x.key,x.value]));
 const fee=Number(map.atskolla_admin_fee??3000);if(!Number.isSafeInteger(fee)||fee<0||fee>1000000)throw new Error("Biaya layanan tidak valid");
 let tariffs:Record<string,number>={};try{tariffs=JSON.parse(map.doku_merchant_tariffs||"{}");}catch{throw new Error("Tarif DOKU tidak valid");}
 return {admin_fee:fee,tariffs,methods:DOKU_METHODS};
}
export function paymentQuote(bill:number,admin:number,method:string,tariffs:Record<string,number>={}){
 const spec=DOKU_METHODS.find(m=>m.id===method);if(!spec)throw new Error("Metode pembayaran tidak valid");
 const gross=Math.round(bill)+admin;
 // QRIS contract supplied by owner. Other fees MUST be confirmed inclusive totals.
 const fee=method==="QRIS"?(gross<=100000?555:Math.round(gross*.007)):tariffs[method];
 if(!Number.isSafeInteger(fee)||fee<0)throw new Error("Tarif metode ini belum dikonfirmasi Super Admin. Pilih QRIS atau hubungi sekolah.");
 const school=Math.round(bill)-fee;if(school<=0)throw new Error("Nominal tagihan tidak cukup untuk biaya pembayaran");
 return {gross,admin,fee,school,method};
}
export function schoolNetSettlement(bankId:string,schoolAmount:number){return [{bank_account_settlement_id:bankId,value:schoolAmount,type:"FIX"}];}
