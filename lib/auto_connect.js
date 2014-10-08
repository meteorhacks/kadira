// AutoConnect using Environment Variables
if(process.env.KADIRA_APP_ID && process.env.KADIRA_APP_SECRET) {
  Kadira.connect(
    process.env.KADIRA_APP_ID,
    process.env.KADIRA_APP_SECRET
  );

  Kadira.connect = function() {
    throw new Error('Kadira has been already connected using credentials from Environment Variables');
  };
} 

// AutoConnect using Meteor.settings
if(
  Meteor.settings.kadira &&
  Meteor.settings.kadira.appId &&
  Meteor.settings.kadira.appSecret
) {
  Kadira.connect(
    Meteor.settings.kadira.appId, 
    Meteor.settings.kadira.appSecret,
    Meteor.settings.kadira.options || {}
  );

  Kadira.connect = function() {
    throw new Error('Kadira has been already connected using credentials from Meteor.settings');
  };
}