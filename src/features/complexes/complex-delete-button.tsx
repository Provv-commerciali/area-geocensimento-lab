"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteComplexAction } from "./actions";

export function ComplexDeleteButton({id}:{id:string}){
  const router=useRouter();const[error,setError]=useState("");const[busy,setBusy]=useState(false);
  async function remove(){
    if(!window.confirm("Eliminare questo complesso? I civici territoriali resteranno disponibili."))return;
    setBusy(true);setError("");const result=await deleteComplexAction(id);setBusy(false);
    if("error" in result){setError(result.error);return}router.push("/censimento/complessi");
  }
  return <div className="complex-delete-control"><button type="button" className="button danger" disabled={busy} onClick={()=>void remove()}>{busy?"Eliminazione…":"Elimina complesso"}</button>{error&&<span className="form-error" role="alert">{error}</span>}</div>;
}
