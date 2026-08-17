import axios from "axios";

export const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});



export const getStatus = () =>
  API.get("/status").then((res)=>res.data);

export const getEvents = () =>
  API.get("/events").then((res)=>res.data);

export const getHoneypotLogs = () =>
  API.get("/honeypot-log").then((res)=>res.data);
