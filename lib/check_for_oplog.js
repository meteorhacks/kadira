// expose for testing purpose
OplogCheck = {};

OplogCheck._070 = function(cursorDescription) {
  var options = cursorDescription.options;
  if (options.limit) {
    return {
      code: "070_LIMIT_NOT_SUPPORTED",
      reason: "Meteor 0.7.0 does not supports limit with oplog",
      solution: "Upgrade your app to Meteor version 0.7.2 or later"
    }
  };

  var exists$ = _.any(cursorDescription.selector, function (value, field) {
    if (field.substr(0, 1) === '$')
      return true;
  });

  if(exists$) {
    return {
      code: "070_$_NOT_SUPPORTED",
      reason: "Meteor 0.7.0 support only equal checks with oplog",
      solution: "Upgrade your app to Meteor version 0.7.2 or later"
    }
  };

  var onlyScalers = _.all(cursorDescription.selector, function (value, field) {
    return typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value instanceof Meteor.Collection.ObjectID;
  });

  if(!onlyScalers) {
    return {
      code: "070_ONLY_SCALERS",
      reason: "Meteor 0.7.0 only supports scalers as comparators",
      solution: "Upgrade your app to Meteor version 0.7.2 or later"
    }
  }

  return true;
};

OplogCheck._071 = function(cursorDescription) {
  var options = cursorDescription.options;
  var matcher = new Minimongo.Matcher(cursorDescription.selector);
  if (options.limit) {
    return {
      code: "071_LIMIT_NOT_SUPPORTED",
      reason: "Meteor 0.7.1 does not support limit with oplog",
      solution: "Upgrade your app to Meteor version 0.7.2 or later"
    }
  };

  return true;
};


OplogCheck.env = function() {
  if(!process.env.MONGO_OPLOG_URL) {
    return {
      code: "NO_ENV",
      reason: "You've not added oplog support for your the Meteor app.",
      solution: "Add oplog support for your Meteor app. see: http://goo.gl/Co1jJc"
    }
  } else {
    return true;
  }
};

OplogCheck.disableOplog = function(cursorDescription) {
  if(cursorDescription.options._disableOplog) {
    return {
      code: "DISABLE_OPLOG",
      reason: "You've disable oplog for this cursor explicitly with _disableOplog option"
    };
  } else {
    return true;
  }
};

OplogCheck.fields = function(cursorDescription) {
  var options = cursorDescription.options;
  if(options.fields) {
    try {
      LocalCollection._checkSupportedProjection(options.fields);
      return true;
    } catch (e) {
      if (e.name === "MinimongoError") {
        return {
          code: "NOT_SUPPORTED_FIELDS",
          reason: "Some of the field filters are not supported: " + e.message,
          solution: "Try removing those field filters."
        };
      } else {
        throw e;
      }
    }
  }
  return true;
};

OplogCheck.skip = function(cursorDescription) {
  if(cursorDescription.options.skip) {
    return {
      code: "SKIP_NOT_SUPPORTED",
      reason: "Skip is not supported with oplog",
      solution: "Try avoid using skip."
    };
  }

  return true;
};

OplogCheck.where = function(cursorDescription) {
  var matcher = new Minimongo.Matcher(cursorDescription.selector);
  if(matcher.hasWhere()) {
    return {
      code: "WHERE_NOT_SUPPORTED",
      reason: "Meteor does not support queries with $where",
      solution: "Try to remove $where from your query."
    }
  };

  return true;
};

OplogCheck.geo = function(cursorDescription) {
  var matcher = new Minimongo.Matcher(cursorDescription.selector);

  if(matcher.hasGeoQuery()) {
    return {
      code: "GEO_NOT_SUPPORTED",
      reason: "Meteor does not support queries with geo partial operators",
      solution: "Try to remove geo partial operators from your query."
    }
  };

  return true;
};

OplogCheck.limitButNoSort = function(cursorDescription) {
  var options = cursorDescription.options;

  if((options.limit && !options.sort)) {
    return {
      code: "LIMIT_NO_SORT",
      reason: "Meteor does not support limit with no sort specifier for oplog",
      solution: "Try adding a sort specifier."
    }
  };

  return true;
};

OplogCheck.olderVersion = function(cursorDescription, driver) {
  if(!driver.constructor.cursorSupported) {
    return {
      code: "OLDER_VERSION",
      reason: "This Meteor version does not have oplog support.",
      solution: "Upgrade your app to Meteor version 0.7.2 or later."
    };
  }
  return true;
};

OplogCheck.gitCheckout = function(cursorDescription, driver) {
  if(!Meteor.release) {
    return {
      code: "GIT_CHECKOUT",
      reason: "Seems like you are running Meteor version which is checkedout from Git. It may be old.",
      solution: "Try to upgrade Meteor Version of update with a latest version from Git."
    };
  }
  return true;
};

var globalMatchers = [
  OplogCheck.env,
  OplogCheck.disableOplog,
  OplogCheck.fields,
  OplogCheck.skip,
  OplogCheck.where,
  OplogCheck.geo,
  OplogCheck.limitButNoSort,
  OplogCheck.olderVersion,
  OplogCheck.gitCheckout
];

var versionMatchers = [
  [/^0\.7\.1/, OplogCheck._071],
  [/^0\.7\.0/, OplogCheck._070],
];

Kadira.checkWhyNoOplog = function(cursorDescription, observerDriver) {
  var meteorVersion = Meteor.release;
  for(var lc=0; lc<versionMatchers.length; lc++) {
    var matcherInfo = versionMatchers[lc];
    if(matcherInfo[0].test(meteorVersion)) {
      var matched = matcherInfo[1](cursorDescription, observerDriver);
      if(matched !== true) {
        return matched;
      }
    }
  }

  for(var lc=0; lc<globalMatchers.length; lc++) {
    var matcher = globalMatchers[lc];
    var matched = matcher(cursorDescription, observerDriver);
    if(matched !== true) {
      return matched;
    }
  }

  return {
    code: "OPLOG_SUPPORTED",
    reason: "This query support oplog. It's weird if it's not.",
    solution: "Please contact Kadira support and discuss"
  };
};
