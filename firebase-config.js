{
  "rules": {
    "games": {
      "$sessionId": {
        ".read": true,
        ".write": true,
        "gameState": {
          ".validate": "newData.hasChildren(['settings', 'greenScore', 'orangeScore', 'currentRound', 'cells', 'timestamp'])"
        },
        "playerBuzz": {
          ".validate": "newData.hasChildren(['name', 'team', 'teamName', 'timestamp', 'active'])"
        },
        "presenterActions": {
          ".validate": "newData.hasChild('type')"
        }
      }
    }
  }
}
