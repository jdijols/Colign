package com.colign.service.email;

/**
 * Outbound transactional email. One method per template — keeps the call site
 * declarative ("send an invitation to X") and the rendering owned here, so
 * controllers never construct subject lines or HTML.
 *
 * Implementations must be safe to call from a request thread: a slow/failing
 * provider should surface as an exception (so the controller returns 502/500),
 * not block forever. Retries are a v2 concern.
 */
public interface EmailClient {

    /**
     * Send a team-invitation email. {@code acceptUrl} is the deep link the
     * recipient clicks to land on the in-app accept screen.
     */
    void sendInvitation(InvitationEmail email);
}
