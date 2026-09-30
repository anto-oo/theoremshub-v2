import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Live counts via Supabase Realtime: subscriptions invalidate the count
// queries so numbers update without polling or manual refresh.
export function useLiveCounts() {
  const qc = useQueryClient()

  const songs = useQuery({
    queryKey: ['count', 'songs'],
    queryFn: async () => {
      const { count, error } = await supabase.from('songs').select('id', { count: 'exact', head: true }).is('archived_at', null)
      if (error) throw error
      return count ?? 0
    },
  })
  const setlists = useQuery({
    queryKey: ['count', 'setlists'],
    queryFn: async () => {
      const { count, error } = await supabase.from('setlists').select('id', { count: 'exact', head: true }).is('archived_at', null)
      if (error) throw error
      return count ?? 0
    },
  })
  const proposals = useQuery({
    queryKey: ['count', 'proposals'],
    queryFn: async () => {
      const { count, error } = await supabase.from('song_proposals').select('id', { count: 'exact', head: true }).is('archived_at', null)
      if (error) throw error
      return count ?? 0
    },
  })
  const rehearsals = useQuery({
    queryKey: ['count', 'rehearsals'],
    queryFn: async () => {
      const { count, error } = await supabase.from('rehearsals').select('id', { count: 'exact', head: true }).is('archived_at', null)
      if (error) throw error
      return count ?? 0
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => qc.invalidateQueries({ queryKey: ['count', 'songs'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'setlists' }, () => qc.invalidateQueries({ queryKey: ['count', 'setlists'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_proposals' }, () => qc.invalidateQueries({ queryKey: ['count', 'proposals'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rehearsals' }, () => qc.invalidateQueries({ queryKey: ['count', 'rehearsals'] }))
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [qc])

  return { songs, setlists, proposals, rehearsals }
}

// The current member's open items: assigned songs and upcoming rehearsals
// they have not responded to yet.
export function useMyAssignedSongs(memberId: string) {
  return useQuery({
    queryKey: ['myAssignedSongs', memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from('assignments').select('id, context_type, context_id').eq('member_id', memberId)
      if (error) throw error
      return data
    },
    enabled: memberId !== '',
  })
}

export function useMyPendingRehearsals(memberId: string) {
  return useQuery({
    queryKey: ['myPendingRehearsals', memberId],
    queryFn: async () => {
      const { data: upcoming, error } = await supabase
        .from('rehearsals')
        .select('id, title, start_time')
        .is('archived_at', null)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10)
      if (error) throw error
      const { data: mine, error: attError } = await supabase
        .from('rehearsal_attendance')
        .select('rehearsal_id')
        .eq('member_id', memberId)
      if (attError) throw attError
      const answered = new Set((mine ?? []).map((r) => r.rehearsal_id))
      return (upcoming ?? []).filter((r) => !answered.has(r.id))
    },
    enabled: memberId !== '',
  })
}

// Earliest upcoming rehearsal / event for the Figma dashboard cards
// ("Prossima prova" / "Prossimo evento"). Independent from the
// unanswered-rehearsals list above: admins also see a date here.
export function useNextRehearsal() {
  return useQuery({
    queryKey: ['nextRehearsal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehearsals')
        .select('id, title, start_time')
        .is('archived_at', null)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useNextEvent() {
  return useQuery({
    queryKey: ['nextEvent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date')
        .is('archived_at', null)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
