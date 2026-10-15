# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Administrators create and manage Telegram giveaways. Telegram users browse giveaways in bot messages, complete an inline human-verification challenge, and join after required channel subscriptions are checked.

## Product Purpose

“Подарки от makeiew” is a Telegram bot for running free or Telegram Stars-funded giveaways, selecting winners when a time or participant threshold is reached, and notifying participants and the administrator.

## Operating Context

The entire participant flow runs in Telegram chats using formatted messages, inline buttons, an inline human-verification challenge, channel links, and Telegram's native Stars payment screen. The bot publishes giveaway announcements to configured Telegram channels.

## Capabilities and Constraints

The bot supports admin-created giveaways with optional photo or GIF media, free or Stars entry, subscription requirements, an inline arithmetic human-verification challenge, scheduled or participant-count completion, winner selection, and Telegram notifications. Stars are credited to the bot; the bot notifies the administrator after payment and cannot transfer Stars directly to a personal balance. Bot token and administrator IDs must be configured before deployment. Channel membership checks require the bot to be an administrator in each required channel. No public website, HTTPS domain, or Mini App is required.

The inline captcha is a basic abuse-reduction step, not a guarantee that a participant is human. Payment collection and giveaway operation must follow Telegram's current platform rules and any applicable local requirements.

## Brand Commitments

The participant-facing bot greeting is “Подарки от makeiew”. The supplied Telegram giveaway-bot screenshots are references for the participation and administration flows.

## Evidence on Hand

User-provided screenshots illustrate giveaway setup, required subscriptions, winner selection, and a human-verification flow. The administrator Telegram ID was supplied. The previously exposed bot token must be revoked and replaced before deployment.

## Product Principles

- Make joining a giveaway clear and quick.
- Verify eligibility server-side before registering an entry.
- Keep payment status, giveaway status, and winner selection auditable.
- Notify the administrator when a Stars payment succeeds.
