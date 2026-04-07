import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "../api/authApi";
import { meQueryKey } from "./queryKeys";

export function useMe(enabled = true) {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}
