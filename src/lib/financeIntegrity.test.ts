import {describe,it,expect} from 'vitest';
import {computeAvailableSaldo} from './bendaharaSaldo';
import {fetchAllPages} from './pagedQuery';
describe('saldo pembayaran',()=>{
 it('tidak mencairkan ulang dana split, offline, atau settlement yang sudah terhubung',()=>{
  const base={status:'paid',payment_method:'doku',settlement_id:null,total_amount:10000,net_amount:10000};
  expect(computeAvailableSaldo([{...base,doku_split:true},{...base,payment_method:'offline_cash'},{...base,settlement_id:'settlement'}, {...base,net_amount:0}],3000)).toEqual({count:1,gross:10000,fee:0,net:0,finalPayout:0});
 });
 it('membaca semua halaman dan meneruskan error alih-alih menampilkan total parsial',async()=>{
  const all=Array.from({length:2501},(_,id)=>({id}));
  const query=()=>({order(){return this},range:async(a:number,b:number)=>({data:all.slice(a,b+1),error:null})});
  expect((await fetchAllPages(query)).data.length).toBe(2501);
  await expect(fetchAllPages(()=>({order(){return this},range:async()=>({data:null,error:new Error('gagal')})}))).rejects.toThrow('gagal');
 });
});
