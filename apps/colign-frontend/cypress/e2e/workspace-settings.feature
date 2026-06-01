Feature: Workspace settings

  Background:
    Given I am signed in as a team lead

  Scenario: A skipper sends an invite from inside the app
    When I open the workspace settings from the sidebar
    Then I should see the Invitations section
    When I type "newbie@example.com" into the invite email field
    And I submit the invite
    Then I should see an invitation sent confirmation

  Scenario: Lead sees all team members in the Members section
    When I open the workspace settings from the sidebar
    Then I should see the Members section
    And the Members list contains "lead@example.com"

  Scenario: Lead renames the team
    When I open the workspace settings from the sidebar
    And I change the team name to "Renamed Acme"
    And I save the team settings
    Then I should see a saved confirmation
    And reloading the page keeps the team name as "Renamed Acme"

  Scenario: Lead removes a teammate
    When I open the workspace settings from the sidebar
    And I click Remove on the member with email "ic@example.com"
    And I confirm the removal
    Then the Members list no longer contains "ic@example.com"

  Scenario: Lead sets team avatar
    When I open the workspace settings from the sidebar
    And I set the team avatar URL to "https://placehold.co/64x64.png"
    And I save the team settings
    Then I should see a saved confirmation
    And the AppShell header shows the team name
