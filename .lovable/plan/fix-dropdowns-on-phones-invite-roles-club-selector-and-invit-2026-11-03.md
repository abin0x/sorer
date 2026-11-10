# Fix dropdowns on phones (invite roles, club selector) and invite errors

## What's going on
On phones, every dropdown in the app uses a custom "bottom sheet" version. It's the same piece behind the invite role picker and the club selector, so one fault breaks all of them. Reading it, I see three likely causes (not yet confirmed):
- When the sheet opens, it adds a fake browser history step. Closing it then steps back again, and that can collide with the app's page router and the new back/forward buttons. The result: the sheet closes on its own, or your pick gets lost.
- Its dimmed background sits in a different layer from the sheet. Inside pop-up windows like Invite Member, the window's own overlay can end up on top of it and block taps.
- The sheet is pinned with forced positioning, which fights how the dropdown library places its list.

The invite errors are a separate problem. I'll capture the exact message instead of guessing. Earlier we saw invites fail when Eclipse has no email service (Resend) connected.

## Steps
1. Reproduce on a phone-sized screen. Open Invite Member and the club selector, take screenshots and record the exact invite error.
2. Rebuild the phone dropdown so it's reliable:
   - Remove the fake history step. Close the sheet with the Cancel button, a tap outside it, or picking an option.
   - Keep the sheet and its background in one layer, above pop-up windows.
   - Keep the large, easy-to-tap rows and the slide-up look.
3. Retest every dropdown on a phone-sized screen: invite role, club selector (System Console and the sidebar), and a few dropdowns inside pop-up windows.
4. Invite errors: base the fix on the message from step 1.
   - If it's the missing email service, show a clear notice in the form. Offer "Add without email": the person gets their role now and can sign in with that email later.
   - If it's something else, fix that cause directly.
5. Add a small automated check that picking a role on a phone keeps the chosen value.

## Technical details
- File: `src/components/ui/select.jsx` (the mobile branch of `SelectContent`, plus the `Select` wrapper context). Drop the `pushState`/`history.back` effect. Render the backdrop inside the same portal/stacking context as the content, with a z-index above the dialog. Replace the `!important` positioning hacks with `position="item-aligned"` off, wrapped in a fixed container.
- Invite: `InviteMemberDialog.jsx`, legacy `inviteClubMember` and `checkResendConnection` actions. Authorization stays `is_club_manager`, with no bypass.
