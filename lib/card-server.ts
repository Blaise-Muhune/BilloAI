import { permanentRedirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { cardPath, isCardKey, slugCandidates } from "@/lib/card";
import { normalizeProfile } from "@/lib/profile-links";
import type { PublicProfile } from "@/lib/types";

export type PublicCard = { uid: string; profile: PublicProfile };

async function claimSlug(uid: string, name: string) {
  return adminDb().runTransaction(async (tx) => {
    const profileRef = adminDb().collection("publicProfiles").doc(uid);
    const profileSnap = await tx.get(profileRef);
    const existing = String(profileSnap.data()?.slug ?? "").trim().toLowerCase();
    if (existing) {
      const mapRef = adminDb().collection("cardSlugs").doc(existing);
      const mapSnap = await tx.get(mapRef);
      if (!mapSnap.exists) {
        tx.set(mapRef, { uid });
        return existing;
      }
      if (String(mapSnap.data()?.uid ?? "") === uid) return existing;
    }
    for (const candidate of slugCandidates(name)) {
      const mapRef = adminDb().collection("cardSlugs").doc(candidate);
      const mapSnap = await tx.get(mapRef);
      if (!mapSnap.exists || String(mapSnap.data()?.uid ?? "") === uid) {
        tx.set(mapRef, { uid });
        tx.set(profileRef, { slug: candidate }, { merge: true });
        return candidate;
      }
    }
    return "";
  });
}

export async function readPublicCard(key: string): Promise<PublicCard | null> {
  if (!isCardKey(key)) return null;
  const db = adminDb();
  const direct = await db.collection("publicProfiles").doc(key).get();
  let uid = "";
  let profile: PublicProfile | null = null;
  if (direct.exists) {
    uid = direct.id;
    profile = normalizeProfile(direct.data() as PublicProfile);
  } else {
    const mapped = await db.collection("cardSlugs").doc(key.toLowerCase()).get();
    uid = String(mapped.data()?.uid ?? "");
    if (!uid) return null;
    const snap = await db.collection("publicProfiles").doc(uid).get();
    if (!snap.exists) return null;
    profile = normalizeProfile(snap.data() as PublicProfile);
  }
  if (!profile?.name) return null;
  if (!profile.slug) {
    const slug = await claimSlug(uid, profile.name);
    if (slug) profile = { ...profile, slug };
  }
  return { uid, profile };
}

export async function readPublicCardOrRedirect(key: string): Promise<PublicCard | null> {
  const card = await readPublicCard(key);
  if (!card) return null;
  if (card.profile.slug && key !== card.profile.slug) permanentRedirect(cardPath(card.profile.slug));
  return card;
}
