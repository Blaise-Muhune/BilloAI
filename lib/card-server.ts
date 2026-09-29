import { adminDb } from "@/lib/firebase/admin";
import { isCardUid } from "@/lib/card";
import { normalizeProfile } from "@/lib/profile-links";
import type { PublicProfile } from "@/lib/types";

export async function readPublicCard(uid: string): Promise<PublicProfile | null> {
  if (!isCardUid(uid)) return null;
  const snap = await adminDb().collection("publicProfiles").doc(uid).get();
  if (!snap.exists) return null;
  const profile = normalizeProfile(snap.data() as PublicProfile);
  if (!profile.name) return null;
  return profile;
}
