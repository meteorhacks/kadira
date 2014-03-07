meteor-apm
==========

[![Meteor Apm - Application Performance Monitoring for Meteor](https://meteorapm.com/images/meteorapm.png)](https://meteorapm.com)

> Meteor APM is currently on Private Beta, you need to [obtain access](https://meteorapm.com) before proceed

Getting started
---------------

1. Create an account at http://ui.meteorapm.com
2. From the UI, create an app. You'll get an `AppId` and an `AppSecret`.
3. Run `mrt add apm` in your project
4. Configure the apm package with the `AppId` and `AppSecret`, by adding the following code snippet to a `server/apm.js` file:

        Meteor.startup(function() {
          Apm.connect('<AppId>', '<AppSecret>');
        });

5. Now you can deploy your application and it will send information to APM as soon as it is connected. It will take up to one minute for data to appear on the screen, since Meteor APM aggregates data by the minute.

More information
----------------

Check out the [Knowledge Base](http://support.meteorapm.com/knowledgebase).
