import type { Database } from './supabase-types';

export type Kid = Database['public']['Tables']['kids']['Row'];
export type Bey = Database['public']['Tables']['beys']['Row'];
export type Battle = Database['public']['Tables']['battles']['Row'];
export type Dispute = Database['public']['Tables']['disputes']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export type DraftBattle = {
  opponent_kid_id: string;
  i_won: boolean;
  my_score: number;
  opp_score: number;
  my_bey_id: string | null;
  opp_bey_id: string | null;
};
