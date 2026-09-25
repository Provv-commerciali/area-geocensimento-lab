"use client";
import { useActionState } from "react";
import { deleteZoneAction } from "./actions";
export function ZoneDeleteButton({zoneId}:{zoneId:string}){const[state,action]=useActionState(deleteZoneAction,{});return <form action={action} onSubmit={event=>{if(!confirm("Eliminare questa zona? Verranno rimosse solo la zona e le sue associazioni. Vie e civici del catalogo resteranno disponibili."))event.preventDefault()}}><input type="hidden" name="zoneId" value={zoneId}/><button className="button danger">Elimina zona</button>{state.error&&<p className="form-error">{state.error}</p>}</form>}
