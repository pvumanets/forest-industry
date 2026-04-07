import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { meQueryKey } from "../auth/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

export function useNavigateOn401(error: unknown | null) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      qc.removeQueries({ queryKey: meQueryKey });
      navigate("/login", { replace: true });
    }
  }, [error, navigate, qc]);
}
