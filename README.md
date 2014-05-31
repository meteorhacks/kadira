## [Kadira - Performance Monitoring for Meteor](https://kadira.io)



[![Kadira - Performance Monitoring for Meteor](https://i.cloudup.com/LwrCCa_RRE.png)](https://kadira.io)

Getting started
---------------

1. Create an account at <https://kadira.io>
2. From the UI, create an app. You'll get an `AppId` and an `AppSecret`.
3. Run `mrt add kadira` in your project
4. Configure your Meteor app with the `AppId` and `AppSecret` by adding the following code snippet to a `server/kadira.js` file:

        Meteor.startup(function() {
          Kadira.connect('<AppId>', '<AppSecret>');
        });

5. Now you can deploy your application and it will send information to Kadira. Wait upto one minute and you'll see, data appeared on the Kadira Dashboard.

More information
----------------

Check out the [Kadira Academy](https://kadira.io/academy) for more information.
