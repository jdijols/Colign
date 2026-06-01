Feature: Workspace settings

  Background:
    Given I am signed in as a team lead

  Scenario: A skipper sends an invite from inside the app
    When I open the workspace settings from the user menu
    Then I should see the Invitations section
    When I type "newbie@example.com" into the invite email field
    And I submit the invite
    Then I should see an invitation sent confirmation
