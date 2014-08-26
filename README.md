[![](https://api.travis-ci.org/meteorhacks/kadira.svg)](https://travis-ci.org/meteorhacks/kadira)

## [Kadira - Performance Monitoring for Meteor](https://kadira.io) 

[![Kadira - Performance Monitoring for Meteor](https://i.cloudup.com/LwrCCa_RRE.png)](https://kadira.io)

### Getting started

1. Create an account at <https://kadira.io>
2. From the UI, create an app. You'll get an `AppId` and an `AppSecret`.
3. Run `meteor add meteorhacks:kadira` in your project
4. (use `mrt add kadira` if you've not yet migrated to meteor 0.9)
5. Configure your Meteor app with the `AppId` and `AppSecret` by adding the following code snippet to a `server/kadira.js` file:

```js
Meteor.startup(function() {
  Kadira.connect('<AppId>', '<AppSecret>');
});
```

Now you can deploy your application and it will send information to Kadira. Wait up to one minute and you'll see data appearing in the Kadira Dashboard.

### Auto Connect

Your app can connect to Kadira using environment variables or using [`Meteor.settings`](http://docs.meteor.com/#meteor_settings).

#### Using Meteor.settings
Use the followng `settings.json` file with your app:

```js
{
  ...
  "kadira": {
    "appId": "<appId>",
    "appSecret": "<appSecret>"
  }
  ...
}
```

The run your app with `meteor --settings=settings.json`.

#### Using Environment Variables

Export the following environment variables before running or deploying your app:

```
export KADIRA_APP_ID=<appId>
export KADIRA_APP_SECRET=<appSecret>
````

### More information

Check out [Kadira Academy](https://kadira.io/academy) for more information.
