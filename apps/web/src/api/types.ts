export type UserRole = "owner" | "marketer" | "site_manager";

export interface OutletMe {
  id: number;
  code: string;
  display_name: string;
  is_virtual: boolean;
}

export interface MeUser {
  id: number;
  login: string;
  display_name: string;
  role: UserRole;
  outlets: OutletMe[];
}
