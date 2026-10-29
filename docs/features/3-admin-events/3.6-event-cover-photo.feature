Feature: Event Cover Photo
  As an admin
  I want to upload, crop, and manage an event's cover photo
  So that the event looks appealing and consistent across the platform

  Context: Business Rules
    - Cover photos are uploaded per event and are optional.
    - Supported formats: JPEG, PNG, WebP.
    - Maximum file size: 10MB.
    - Uploaded images must be cropped to a 16:9 aspect ratio (1920x1080 output).
    - Admins can drag and drop images or click to browse.
    - A cropping dialog is presented upon successful file selection.
    - The previous cover photo is deleted when a new one is uploaded.
    - The cover photo is displayed on event cards, headers, and previews.

  Scenario: Upload a valid cover photo
    Given I am on the event form
    And I see the "Cover Photo" section
    When I select a valid JPEG image under 10MB
    Then the image cropping dialog opens
    And I can adjust the crop area
    When I click "Save & Upload"
    Then the cropped image is uploaded
    And I see a success message "Cover photo uploaded successfully"
    And the new cover photo is displayed in the form preview

  Scenario: Attempt to upload an invalid file type
    Given I am on the event form
    When I select a GIF or PDF file
    Then I see an error message "Invalid file type. Please upload a JPEG, PNG, or WebP image."
    And the upload is rejected

  Scenario: Attempt to upload a file exceeding the size limit
    Given I am on the event form
    When I select an image larger than 10MB
    Then I see an error message "File is too large. Maximum allowed size is 10MB."
    And the upload is rejected

  Scenario: Replace an existing cover photo
    Given the event already has a cover photo
    When I upload a new valid image
    And I apply the crop
    Then the new image replaces the old one
    And the old image is deleted from storage
    And I see a success message "Adjusted cover photo saved successfully"

  Scenario: Remove an existing cover photo
    Given the event already has a cover photo
    When I click the remove (trash can) icon next to the cover photo
    Then the cover photo is deleted
    And the form preview reverts to the default or empty state
    And I see an info message "Cover photo removed"

  Scenario: Adjust crop of an existing cover photo
    Given the event already has a cover photo
    When I click the adjust (crop) icon
    Then the image cropping dialog opens with the current image
    And I can zoom, rotate, and adjust the crop
    When I click "Save & Upload"
    Then the newly cropped version is saved
    And the previous version is deleted
    And I see a success message "Adjusted cover photo saved successfully"
