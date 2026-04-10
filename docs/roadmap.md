# Game Invite App — Roadmap

## Overview

Game Invite App is a platform that lets users quickly send play requests to friends for a specific video game at a specific time. Think of two friends at school or work — one wants to ask the other, "Want to play Arc Raiders at 7?" This app makes that interaction simple, social, and asynchronous.

---

## Core Features

### 1. Game Invite / Play Request
- A user can create a **play request** specifying:
  - A game (selected from a categorized game browser)
  - A proposed date and time
  - One or more friends to invite
- The request is sent as a notification/ping to all selected recipients.

### 2. Request Response System
Recipients of a play request can respond with one of three actions:
- ✅ **Accept** — Confirm attendance for the proposed game and time.
- ❌ **Deny** — Decline the request; optionally include a short message explaining why.
- ⏳ **Postpone** — Suggest the time doesn't work; optionally include a short message (e.g., "Maybe after 9?").

### 3. Multi-Friend Invites
- A single play request can be sent to **multiple friends at once**.
- The request creator can view a live summary of responses:
  - Total invites sent
  - Number of responses received
  - Number of acceptances

### 4. Game Browser / Selection Interface
- Games are organized by **console/platform categories** (e.g., PlayStation, Xbox, PC, Nintendo Switch, Mobile).
- An **"Other"** category is available for games that don't fit a standard platform.
- Users can search or browse to select the game for their invite.

---

## Account & Social System

### 5. User Accounts
- Users create accounts to send and receive invites.
- Authentication will support standard sign-up/login flows.

### 6. Friend Relationships
- An **external database** will manage account-to-account relationships (friendships).
- Users can add/remove friends and manage their friend list.
- Invites can only be sent to existing friends.

---

## Design

- UI/UX designs are planned separately and will be integrated once finalized.
- The interface should feel lightweight and fast — optimized for quick interactions between friends.

---

## Planned Phases

### Phase 1 — Foundation
- [ ] Project scaffolding and tech stack setup
- [ ] User authentication (sign up, log in, log out)
- [ ] External database integration for user accounts and friend relationships
- [ ] Friend list management (add, view, remove friends)

### Phase 2 — Core Invite Flow
- [ ] Game browser with platform/console categories and "Other" option
- [ ] Create a play request (game + time + recipient selection)
- [ ] Multi-friend invite support for a single event
- [ ] Send and receive play request notifications

### Phase 3 — Response System
- [ ] Accept / Deny / Postpone response actions
- [ ] Optional message field on Deny and Postpone responses
- [ ] Response summary view for the invite sender (sent / responded / accepted counts)

### Phase 4 — Polish & Design
- [ ] Apply finalized UI/UX designs
- [ ] Notification system refinements
- [ ] Performance and reliability improvements
- [ ] User testing and feedback iteration
