import { useQuery } from "@tanstack/react-query";
import {
  getStatus,
  getEvents,
  getHoneypotLogs,
} from "../api/ghostGuard";

export const useGhostGuard = () => {
  const statusQuery = useQuery({
    queryKey: ["ghost-guard-status"],
    queryFn: getStatus,
    refetchInterval: 2000,
  });

  const eventsQuery = useQuery({
    queryKey: ["ghost-guard-events"],
    queryFn: getEvents,
    refetchInterval: 2000,
  });

  const honeypotQuery = useQuery({
    queryKey: ["ghost-guard-honeypot"],
    queryFn: getHoneypotLogs,
    refetchInterval: 2000,
  });

  return {
    status: statusQuery,
    events: eventsQuery,
    honeypot: honeypotQuery,
  };
};