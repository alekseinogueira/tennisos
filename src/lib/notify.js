// Notification-email helpers.
//
// A roster student has no email until they claim their invite: the coach can add
// someone from WhatsApp with just a name and a phone (migration 015), and the
// address only lands on the row when the student signs up. So every "email the
// student" flow has to tolerate a missing address.
//
// Skipping is NOT failing, and the toasts must not conflate them — "sent 2/3"
// reads like something broke, when really the third player just hasn't signed up
// yet and there was never an address to send to.

/** Split people into those we can email and those we can't (no address yet). */
export function partitionByEmail(people, getEmail = (p) => p?.email) {
  const withEmail = []
  const withoutEmail = []
  for (const p of people ?? []) {
    if (getEmail(p)) withEmail.push(p)
    else withoutEmail.push(p)
  }
  return { withEmail, withoutEmail }
}

/** Honest tail for a batch toast. Always starts lowercase — every call site
 *  appends it after "… — ", so it finishes a sentence rather than starting one.
 *
 *  attempted = how many we actually tried; sent = how many succeeded;
 *  skipped = how many had no address on file. */
export function emailClause({ sent, attempted, skipped }) {
  const unclaimed =
    skipped > 0
      ? skipped > 1
        ? `${skipped} haven’t claimed their invite yet.`
        : `1 hasn’t claimed their invite yet.`
      : ''

  if (attempted === 0) {
    return skipped > 0
      ? `no emails yet: ${skipped > 1 ? `${skipped} haven’t` : 'they haven’t'} claimed their invite.`
      : 'no one to email.'
  }
  if (sent === attempted) {
    return unclaimed ? `emails sent to ${sent}. ${unclaimed}` : 'emails sent.'
  }
  const partial = `emails sent ${sent}/${attempted}.`
  return unclaimed ? `${partial} ${unclaimed}` : partial
}
