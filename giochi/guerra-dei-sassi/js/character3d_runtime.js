(function () {
  'use strict';

  const STYLE_ID = 'sassi-character3d-runtime-v37-2-motion-registry-state-loop-style';
  const MODEL_VIEWER_SRC = 'assets/vendor/model-viewer/model-viewer-4.2.0.min.js';
  const MESHOPT_DECODER_SRC = 'assets/vendor/meshoptimizer/meshopt_decoder_compat.js';
  const REGISTRY = Object.freeze({
  "nina-ciottolo": {
    "name": "Nina Ciottolo",
    "env": "stream",
    "src": "assets/models/nina-ciottolo/character.glb",
    "idle": "Stand_Up8",
    "cameraOrbit": {
      "portrait": "320deg 78deg 8.80m",
      "cinema": "320deg 75deg 11.40m",
      "result": "320deg 76deg 10.50m",
      "menu": "320deg 78deg 9.80m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.76,
        0.38
      ],
      "cinema": [
        0.68,
        0.46
      ],
      "result": [
        0.7,
        0.48
      ],
      "menu": [
        0.74,
        0.38
      ]
    },
    "durations": {
      "Alert": 1033,
      "Angry_Ground_Stomp": 4000,
      "Cheer_with_Both_Hands_1": 1400,
      "Idle_10": 2200,
      "Idle_13": 3667,
      "Running": 11400,
      "Stand_Up8": 633,
      "Walking": 2333
    },
    "actions": {
      "idle_default": {
        "animation": "Stand_Up8",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1700,
        "mode": "introShot",
        "loopWhileActive": false,
        "returnIdleOnExit": true,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Angry_Ground_Stomp",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Angry_Ground_Stomp",
        "rating": "OK",
        "loop": true,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Idle_10",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Cheer_with_Both_Hands_1",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 1400,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Idle_10",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Cheer_with_Both_Hands_1",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Stand_Up8",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "bruno-basalto": {
    "name": "Bruno Basalto",
    "env": "quarry",
    "src": "assets/models/bruno-basalto/character.glb",
    "idle": "Indoor_Swing",
    "cameraOrbit": {
      "portrait": "315deg 78deg 9.20m",
      "cinema": "315deg 75deg 11.80m",
      "result": "315deg 76deg 10.90m",
      "menu": "315deg 78deg 10.10m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.74,
        0.42
      ],
      "cinema": [
        0.68,
        0.5
      ],
      "result": [
        0.7,
        0.5
      ],
      "menu": [
        0.74,
        0.42
      ]
    },
    "durations": {
      "Agree_Gesture": 7000,
      "Angry_Stomp": 8000,
      "Arise": 633,
      "Idle_15": 1667,
      "Indoor_Swing": 1033,
      "Running": 13000,
      "Skill_03": 8000,
      "Walking": 1833
    },
    "actions": {
      "idle_default": {
        "animation": "Indoor_Swing",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 0,
        "maxMs": 800,
        "mode": "introShot",
        "loopWhileActive": false,
        "returnIdleOnExit": false,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 1.0,
        "minMs": 2000,
        "maxMs": 3000,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Angry_Stomp",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Angry_Stomp",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Skill_03",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Idle_15",
        "rating": "OK",
        "loop": false,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Indoor_Swing",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "mara-selce": {
    "name": "Mara Selce",
    "env": "ravine",
    "src": "assets/models/mara-selce/character.glb",
    "idle": "Alert",
    "cameraOrbit": {
      "portrait": "320deg 78deg 9.00m",
      "cinema": "320deg 75deg 11.40m",
      "result": "320deg 76deg 10.70m",
      "menu": "320deg 78deg 9.90m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.74,
        0.4
      ],
      "cinema": [
        0.68,
        0.48
      ],
      "result": [
        0.7,
        0.48
      ],
      "menu": [
        0.74,
        0.4
      ]
    },
    "durations": {
      "Agree_Gesture": 13000,
      "Alert": 4000,
      "Angry_Stomp": 8000,
      "Cheer_with_Both_Hands_1": 11500,
      "Confused_Scratch": 8033,
      "FunnyDancing_03": 633,
      "Running": 16267,
      "Shake_It_Off_Dance": 1667,
      "Stand_Up4": 2200,
      "Walking": 1033
    },
    "actions": {
      "idle_default": {
        "animation": "Alert",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Running",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1700,
        "mode": "introLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Running",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 1.0,
        "minMs": 1200,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Running",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Angry_Stomp",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Running",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Alert",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "teo-pietrafocaia": {
    "name": "Teo Pietrafocaia",
    "env": "forge",
    "src": "assets/models/teo-pietrafocaia/character.glb",
    "idle": "Idle_6",
    "cameraOrbit": {
      "portrait": "318deg 78deg 9.30m",
      "cinema": "318deg 75deg 11.80m",
      "result": "318deg 76deg 11.00m",
      "menu": "318deg 78deg 10.20m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.7,
        0.44
      ],
      "cinema": [
        0.64,
        0.52
      ],
      "result": [
        0.66,
        0.52
      ],
      "menu": [
        0.7,
        0.44
      ]
    },
    "durations": {
      "Angry_Ground_Stomp": 7400,
      "Angry_Stomp": 633,
      "Headache_Relief": 6067,
      "Idle_6": 1033,
      "Idle_7": 1400,
      "Look_Around_Dumbfounded": 8000,
      "Mirror_Viewing": 8767,
      "Personalized_Gesture": 6367,
      "Running": 7333,
      "Stand_Up3": 2000,
      "Talk_with_Right_Hand_Open": 3767,
      "Walking": 4833
    },
    "actions": {
      "idle_default": {
        "animation": "Idle_6",
        "rating": "DA_VALUTARE",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Running",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 3100,
        "maxMs": 3100,
        "mode": "introShot",
        "loopWhileActive": false,
        "returnIdleOnExit": true,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Idle_6",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Angry_Ground_Stomp",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 1200,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Talk_with_Right_Hand_Open",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Stand_Up3",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Idle_7",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Idle_6",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "lalla-lapillo": {
    "name": "Lalla Lapillo",
    "env": "volcano-dance",
    "src": "assets/models/lalla-lapillo/character.glb",
    "idle": "Attack",
    "cameraOrbit": {
      "portrait": "322deg 78deg 9.10m",
      "cinema": "322deg 75deg 11.60m",
      "result": "322deg 76deg 10.80m",
      "menu": "322deg 78deg 10.00m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.7,
        0.44
      ],
      "cinema": [
        0.64,
        0.52
      ],
      "result": [
        0.66,
        0.52
      ],
      "menu": [
        0.7,
        0.44
      ]
    },
    "durations": {
      "Angry_Ground_Stomp_2": 2433,
      "Angry_Stomp": 1033,
      "Attack": 4100,
      "Boom_Dance": 1800,
      "Cheer_with_Both_Hands": 8000,
      "Formal_Bow": 2800,
      "FunnyDancing_02": 7133,
      "Headache_Relief": 7500,
      "Idle_6": 2933,
      "Running": 7667,
      "Stand_Up9": 4833,
      "Walking": 7400,
      "Wave_One_Hand": 633
    },
    "actions": {
      "idle_default": {
        "animation": "Attack",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "FunnyDancing_02",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1700,
        "mode": "introLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 900,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Headache_Relief",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Cheer_with_Both_Hands",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Headache_Relief",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Cheer_with_Both_Hands",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 900,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Attack",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "orbo-granito": {
    "name": "Orbo Granito",
    "env": "moss-ruins",
    "src": "assets/models/orbo-granito/character.glb",
    "idle": "Agree_Gesture",
    "cameraOrbit": {
      "portrait": "315deg 78deg 9.25m",
      "cinema": "315deg 75deg 11.90m",
      "result": "315deg 76deg 11.00m",
      "menu": "315deg 78deg 10.20m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.72,
        0.44
      ],
      "cinema": [
        0.66,
        0.52
      ],
      "result": [
        0.68,
        0.52
      ],
      "menu": [
        0.72,
        0.44
      ]
    },
    "durations": {
      "Agree_Gesture": 1033,
      "Alert": 13000,
      "Angry_Stomp": 4000,
      "Confused_Scratch": 11500,
      "Gentlemans_Bow": 7267,
      "Headache_Relief": 4833,
      "Idle_5": 1867,
      "Running": 11400,
      "Stand_Up5": 8000,
      "Walking": 633
    },
    "actions": {
      "idle_default": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1700,
        "mode": "introShot",
        "loopWhileActive": false,
        "returnIdleOnExit": true,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Agree_Gesture",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "zelda-quarzo": {
    "name": "Zelda Quarzo",
    "env": "crystal-cave",
    "src": "assets/models/zelda-quarzo/character.glb",
    "idle": "Idle_15",
    "cameraOrbit": {
      "portrait": "322deg 78deg 8.95m",
      "cinema": "322deg 75deg 11.50m",
      "result": "322deg 76deg 10.70m",
      "menu": "322deg 78deg 9.90m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.76,
        0.38
      ],
      "cinema": [
        0.7,
        0.46
      ],
      "result": [
        0.72,
        0.46
      ],
      "menu": [
        0.76,
        0.38
      ]
    },
    "durations": {
      "360_Power_Spin_Jump": 3067,
      "Agree_Gesture": 13000,
      "Angry_Stomp": 8000,
      "FunnyDancing_01": 633,
      "Headache_Relief": 1033,
      "Idle_15": 7767,
      "Running": 4833,
      "Stand_Up8": 7000,
      "Walking": 2333
    },
    "actions": {
      "idle_default": {
        "animation": "Idle_15",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1700,
        "mode": "introShot",
        "loopWhileActive": false,
        "returnIdleOnExit": true,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Running",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 1900,
        "maxMs": 2100,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Agree_Gesture",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Angry_Stomp",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "360_Power_Spin_Jump",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Angry_Stomp",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Idle_15",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "prof-ossidiana": {
    "name": "Prof. Ossidiana",
    "env": "blackboard",
    "src": "assets/models/prof-ossidiana/character.glb",
    "idle": "Angry_Stomp",
    "cameraOrbit": {
      "portrait": "318deg 78deg 9.15m",
      "cinema": "318deg 75deg 11.70m",
      "result": "318deg 76deg 10.90m",
      "menu": "318deg 78deg 10.00m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.72,
        0.42
      ],
      "cinema": [
        0.66,
        0.5
      ],
      "result": [
        0.68,
        0.5
      ],
      "menu": [
        0.72,
        0.42
      ]
    },
    "durations": {
      "Angry_Ground_Stomp_2": 4833,
      "Angry_Stomp": 3667,
      "Headache_Relief": 4167,
      "Idle_10": 1033,
      "Motivational_Cheer": 1800,
      "Running": 8000,
      "Stand_Clap_and_Sit_Down": 9000,
      "Stand_Up8": 633,
      "Walking": 2333
    },
    "actions": {
      "idle_default": {
        "animation": "Angry_Stomp",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Walking",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 700,
        "mode": "introShot",
        "loopWhileActive": false,
        "returnIdleOnExit": true,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Angry_Stomp",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Stand_Clap_and_Sit_Down",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 2400,
        "maxMs": 2600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Idle_10",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Motivational_Cheer",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Stand_Up8",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Motivational_Cheer",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1600,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Angry_Stomp",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  },
  "imperio": {
    "name": "Nonno Imperio",
    "env": "old-camp",
    "src": "assets/models/imperio/character.glb",
    "idle": "Idle_10",
    "cameraOrbit": {
      "portrait": "316deg 78deg 9.35m",
      "cinema": "316deg 75deg 12.00m",
      "result": "316deg 76deg 11.10m",
      "menu": "316deg 78deg 10.30m"
    },
    "fov": {
      "portrait": "26deg",
      "cinema": "31deg",
      "result": "30deg",
      "menu": "28deg"
    },
    "lighting": {
      "portrait": [
        0.72,
        0.44
      ],
      "cinema": [
        0.66,
        0.52
      ],
      "result": [
        0.68,
        0.52
      ],
      "menu": [
        0.72,
        0.44
      ]
    },
    "durations": {
      "Angry_Ground_Stomp": 1400,
      "Angry_Stomp": 7267,
      "Big_Wave_Hello": 1867,
      "Gentlemans_Bow": 633,
      "Headache_Relief": 1667,
      "Idle_10": 1033,
      "Idle_5": 8000,
      "Kneel_on_One_Knee_and_Stand": 5333,
      "Running": 4833,
      "Stand_Up4": 3667,
      "Walking": 2567
    },
    "actions": {
      "idle_default": {
        "animation": "Idle_10",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "idleLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": false,
        "priority": 0
      },
      "intro_reveal": {
        "animation": "Headache_Relief",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1700,
        "mode": "introShot",
        "loopWhileActive": false,
        "returnIdleOnExit": true,
        "priority": 95
      },
      "watch_neutral": {
        "animation": "Idle_10",
        "rating": "OK",
        "loop": true,
        "returnIdle": false,
        "cutRatio": 1.0,
        "minMs": 0,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 8
      },
      "thinking": {
        "animation": "Big_Wave_Hello",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 30
      },
      "happy_smug": {
        "animation": "Idle_10",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 55
      },
      "angry_mad": {
        "animation": "Idle_10",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 72
      },
      "win": {
        "animation": "Kneel_on_One_Knee_and_Stand",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 3000,
        "maxMs": 3000,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "lose": {
        "animation": "Running",
        "rating": "OK",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 800,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 98
      },
      "special_optional": {
        "animation": "Idle_10",
        "rating": "DA_VALUTARE",
        "loop": false,
        "returnIdle": true,
        "cutRatio": 0.72,
        "minMs": 700,
        "maxMs": 1400,
        "mode": "stateLoop",
        "loopWhileActive": true,
        "returnIdleOnExit": true,
        "priority": 60
      }
    }
  }
});
  const PILOT_IDS = Object.freeze(Object.keys(REGISTRY).reduce(function (acc, id) { acc[id] = true; return acc; }, {}));
  const AUTO_CAMERA_FIT_META = Object.freeze({
  "bruno-basalto": {
    "width": 2.05,
    "height": 1.9406,
    "depth": 1.0061,
    "widthHeightRatio": 1.0564,
    "fitClass": "medium",
    "baseRadius": 5.2,
    "targetRatio": 0.56,
    "fov": {
      "portrait": "28deg",
      "menu": "29deg",
      "cinema": "32deg",
      "result": "30deg"
    }
  },
  "imperio": {
    "width": 0.8727,
    "height": 1.7,
    "depth": 0.6667,
    "widthHeightRatio": 0.5133,
    "fitClass": "tall",
    "baseRadius": 4.35,
    "targetRatio": 0.58,
    "fov": {
      "portrait": "29deg",
      "menu": "30deg",
      "cinema": "33deg",
      "result": "31deg"
    },
    "cameraOverride": {
      "portrait": {
        "radius": 3.15,
        "targetRatio": 0.73,
        "fov": "22deg",
        "minDist": "2.6m",
        "maxDist": "10m"
      },
      "result": {
        "radius": 4.65,
        "targetRatio": 0.68,
        "fov": "28deg",
        "minDist": "3.2m",
        "maxDist": "13m"
      }
    }
  },
  "lalla-lapillo": {
    "width": 1.3597,
    "height": 2.48,
    "depth": 1.1407,
    "widthHeightRatio": 0.5483,
    "fitClass": "medium",
    "baseRadius": 5.2,
    "targetRatio": 0.56,
    "fov": {
      "portrait": "28deg",
      "menu": "29deg",
      "cinema": "32deg",
      "result": "30deg"
    }
  },
  "mara-selce": {
    "width": 1.3115,
    "height": 2.21,
    "depth": 0.9484,
    "widthHeightRatio": 0.5934,
    "fitClass": "medium",
    "baseRadius": 5.2,
    "targetRatio": 0.56,
    "fov": {
      "portrait": "28deg",
      "menu": "29deg",
      "cinema": "32deg",
      "result": "30deg"
    }
  },
  "nina-ciottolo": {
    "width": 2.6427,
    "height": 3.0,
    "depth": 1.6016,
    "widthHeightRatio": 0.8809,
    "fitClass": "compact",
    "baseRadius": 10.2,
    "targetRatio": 0.53,
    "fov": {
      "portrait": "27deg",
      "menu": "28deg",
      "cinema": "31deg",
      "result": "30deg"
    }
  },
  "orbo-granito": {
    "width": 1.1376,
    "height": 2.0,
    "depth": 0.9405,
    "widthHeightRatio": 0.5688,
    "fitClass": "medium",
    "baseRadius": 5.2,
    "targetRatio": 0.56,
    "fov": {
      "portrait": "28deg",
      "menu": "29deg",
      "cinema": "32deg",
      "result": "30deg"
    }
  },
  "prof-ossidiana": {
    "width": 1.0239,
    "height": 2.14,
    "depth": 0.8437,
    "widthHeightRatio": 0.4784,
    "fitClass": "tall",
    "baseRadius": 4.35,
    "targetRatio": 0.58,
    "fov": {
      "portrait": "29deg",
      "menu": "30deg",
      "cinema": "33deg",
      "result": "31deg"
    }
  },
  "teo-pietrafocaia": {
    "width": 1.1371,
    "height": 2.55,
    "depth": 1.2183,
    "widthHeightRatio": 0.4459,
    "fitClass": "medium",
    "baseRadius": 5.2,
    "targetRatio": 0.56,
    "fov": {
      "portrait": "28deg",
      "menu": "29deg",
      "cinema": "32deg",
      "result": "30deg"
    },
    "cameraOverride": {
      "portrait": {
        "radius": 3.85,
        "targetRatio": 0.67,
        "fov": "23deg",
        "minDist": "2.7m",
        "maxDist": "11m"
      },
      "result": {
        "radius": 4.05,
        "targetRatio": 0.65,
        "fov": "24deg",
        "minDist": "2.8m",
        "maxDist": "12m"
      }
    }
  },
  "zelda-quarzo": {
    "width": 1.8456,
    "height": 2.8,
    "depth": 1.4661,
    "widthHeightRatio": 0.6591,
    "fitClass": "medium",
    "baseRadius": 5.2,
    "targetRatio": 0.56,
    "fov": {
      "portrait": "28deg",
      "menu": "29deg",
      "cinema": "32deg",
      "result": "30deg"
    }
  }
});

  const AUTO_CAMERA_CONTEXT = Object.freeze({
    // V37.3: 10.2m = compact/small come Nina; 5.2m = medium; tall ancora più vicino.
    portrait: { multiplier: 1.00, elevation: '78deg', minDist: '3.2m', maxDist: '14m' },
    menu:     { multiplier: 1.08, elevation: '78deg', minDist: '3.2m', maxDist: '15m' },
    ranking:  { multiplier: 0.74, elevation: '77deg', minDist: '2.4m', maxDist: '10m' },
    result:   { multiplier: 1.10, elevation: '76deg', minDist: '3.2m', maxDist: '16m' },
    cinema:   { multiplier: 1.22, elevation: '75deg', minDist: '3.4m', maxDist: '18m' }
  });


  function idOf(opponent) { return String(opponent && opponent.id ? opponent.id : '').toLowerCase(); }
  function getCfg(opponentOrId) { const id = typeof opponentOrId === 'string' ? opponentOrId : idOf(opponentOrId); return REGISTRY[id] || null; }
  function text(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function cssMood(mood) { return String(mood || 'neutral').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'neutral'; }
  function normalizedView(view) {
    const raw = String(view || 'portrait').toLowerCase();
    if (raw.indexOf('result') >= 0) return 'result';
    if (raw.indexOf('cinema') >= 0 || raw.indexOf('battle') >= 0 || raw.indexOf('intro') >= 0 || raw.indexOf('reveal') >= 0) return 'cinema';
    if (raw.indexOf('ranking') >= 0 || raw.indexOf('ladder') >= 0) return 'ranking';
    if (raw.indexOf('menu') >= 0 || raw.indexOf('preview') >= 0) return 'menu';
    return 'portrait';
  }

  function isRevealView(view) {
    const raw = String(view || '').toLowerCase();
    return raw.indexOf('intro') >= 0 || raw.indexOf('reveal') >= 0;
  }

  function splitOrbit(orbit) {
    return parseOrbitParts(orbit || '320deg 78deg 9m');
  }

  function numberFromMetersString(value, fallback) {
    const m = String(value || '').match(/(-?\d+(?:\.\d+)?)m/);
    const n = m ? Number(m[1]) : Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function numberFromDegString(value, fallback) {
    const m = String(value || '').match(/(-?\d+(?:\.\d+)?)deg/);
    const n = m ? Number(m[1]) : Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function deg(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0deg';
    return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '').replace(/0$/, '') + 'deg';
  }


  function configureModelViewerDecoders() {
    try {
      const root = (typeof self !== 'undefined') ? self : window;
      root.__SASSI_MESHOPT_DECODER_LOCATION = MESHOPT_DECODER_SRC;
      root.ModelViewerElement = root.ModelViewerElement || {};
      root.ModelViewerElement.meshoptDecoderLocation = MESHOPT_DECODER_SRC;

      // If <model-viewer> has already been defined by a browser/cache race, set the
      // static property on the actual constructor too. The normal path still sets it
      // before the first element is created.
      if (root.customElements && root.customElements.get) {
        const ModelViewerCtor = root.customElements.get('model-viewer');
        if (ModelViewerCtor) ModelViewerCtor.meshoptDecoderLocation = MESHOPT_DECODER_SRC;
      }
    } catch (err) {
      console.warn('[SASSI 3D] Meshopt decoder configuration failed:', err);
    }
  }

  function installModelViewerDiagnostics() {
    if (window.__SASSI_MODEL_VIEWER_DIAGNOSTICS_INSTALLED) return;
    window.__SASSI_MODEL_VIEWER_DIAGNOSTICS_INSTALLED = true;
    window.SASSI_MESHOPT_DECODER = {
      location: MESHOPT_DECODER_SRC,
      configuredAt: Date.now(),
      requiredExtension: 'EXT_meshopt_compression'
    };
    document.addEventListener('error', function (event) {
      const target = event && event.target;
      if (!target || !target.tagName || String(target.tagName).toLowerCase() !== 'model-viewer') return;
      console.warn('[SASSI 3D] model-viewer load error', {
        src: target.getAttribute('src'),
        decoder: MESHOPT_DECODER_SRC,
        event: event
      });
    }, true);
    document.addEventListener('load', function (event) {
      const target = event && event.target;
      if (!target || !target.tagName || String(target.tagName).toLowerCase() !== 'model-viewer') return;
      if (target.dataset && target.dataset.sassiRuntimeActive === 'false') {
        try { if (typeof target.pause === 'function') target.pause(); } catch (err) {}
      }
      console.info('[SASSI 3D] model-viewer loaded', {
        src: target.getAttribute('src'),
        decoder: MESHOPT_DECODER_SRC
      });
    }, true);
  }

  function ensureModelViewerModule() {
    configureModelViewerDecoders();
    installModelViewerDiagnostics();
    if (window.customElements && customElements.get && customElements.get('model-viewer')) return;
    if (document.querySelector('script[data-sassi-model-viewer]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_SRC;
    script.setAttribute('data-sassi-model-viewer', 'v37');
    document.head.appendChild(script);
  }

  function cfgValue(cfg, key, view, fallback) {
    const table = cfg && cfg[key];
    if (!table) return fallback;
    return table[view] || table.portrait || fallback;
  }

  function idFromCfg(cfg) {
    if (!cfg) return '';
    const keys = Object.keys(REGISTRY);
    for (let i = 0; i < keys.length; i += 1) {
      if (REGISTRY[keys[i]] === cfg) return keys[i];
    }
    return '';
  }

  function parseOrbitParts(orbit) {
    const parts = String(orbit || '').trim().split(/\s+/);
    return {
      azimuth: parts[0] || '320deg',
      elevation: parts[1] || '78deg',
      radius: parts[2] || '9m'
    };
  }

  function meters(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '9m';
    return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '').replace(/0$/, '') + 'm';
  }

  function cameraFitMeta(cfg) {
    return AUTO_CAMERA_FIT_META[idFromCfg(cfg)] || null;
  }

  function resolveCameraPose(cfg, view) {
    const ctx = normalizedView(view);
    const legacyOrbit = cfgValue(cfg, 'cameraOrbit', ctx, '320deg 78deg 9.00m');
    const legacyFov = cfgValue(cfg, 'fov', ctx, '28deg');
    const legacy = parseOrbitParts(legacyOrbit);
    const fit = cameraFitMeta(cfg);
    const context = AUTO_CAMERA_CONTEXT[ctx] || AUTO_CAMERA_CONTEXT.portrait;

    if (!fit) {
      return {
        mode: 'legacy',
        orbit: legacyOrbit,
        target: cfgValue(cfg, 'cameraTarget', ctx, '0m 1m 0m'),
        fov: legacyFov,
        minDist: context.minDist,
        maxDist: context.maxDist,
        fit: null
      };
    }

    const overrideTable = fit.cameraOverride || {};
    const override = overrideTable[ctx] || null;
    const radius = Math.max(
      2.6,
      Number(override && override.radius ? override.radius : (Number(fit.baseRadius || 7.2) * Number(context.multiplier || 1)))
    );
    const targetRatio = Number(override && override.targetRatio ? override.targetRatio : (fit.targetRatio || 0.56));
    const targetY = Math.max(0.45, Number(fit.height || 2) * targetRatio);
    const fovTable = fit.fov || {};
    return {
      mode: override ? 'autoFitOverride' : 'autoFit',
      orbit: (legacy.azimuth || '320deg') + ' ' + ((override && override.elevation) || context.elevation || legacy.elevation || '78deg') + ' ' + meters(radius),
      target: '0m ' + meters(targetY) + ' 0m',
      fov: (override && override.fov) || fovTable[ctx] || legacyFov,
      minDist: (override && override.minDist) || context.minDist,
      maxDist: (override && override.maxDist) || context.maxDist,
      fit: fit,
      override: override
    };
  }

  function revealPoseFromFinalPose(pose, phase) {
    const parts = splitOrbit(pose.orbit);
    const az = numberFromDegString(parts.azimuth, 320);
    const el = numberFromDegString(parts.elevation, 75);
    const r = numberFromMetersString(parts.radius, 9);
    const fovN = numberFromDegString(pose.fov, 31);
    if (phase === 'start') {
      return {
        orbit: deg(az - 10) + ' ' + deg(Math.max(58, el - 9)) + ' ' + meters(r * 1.26),
        target: pose.target,
        fov: deg(Math.min(42, fovN + 8)),
        minDist: pose.minDist,
        maxDist: pose.maxDist,
        fit: pose.fit,
        mode: 'revealStart'
      };
    }
    if (phase === 'silhouette') {
      return {
        orbit: deg(az - 4) + ' ' + deg(Math.max(62, el - 5)) + ' ' + meters(r * 1.14),
        target: pose.target,
        fov: deg(Math.min(38, fovN + 5)),
        minDist: pose.minDist,
        maxDist: pose.maxDist,
        fit: pose.fit,
        mode: 'revealSilhouette'
      };
    }
    return pose;
  }

  function cameraAttrs(cfg, view) {
    const pose = resolveCameraPose(cfg, view);
    const initialPose = isRevealView(view) ? revealPoseFromFinalPose(pose, 'start') : pose;
    return 'camera-orbit="' + text(initialPose.orbit) + '" camera-target="' + text(initialPose.target) + '" field-of-view="' + text(initialPose.fov) + '" min-camera-orbit="auto auto ' + text(initialPose.minDist) + '" max-camera-orbit="auto auto ' + text(initialPose.maxDist) + '"';
  }
  function lightingConfig(cfg, view) {
    const ctx = normalizedView(view);
    const pair = cfgValue(cfg, 'lighting', ctx, [0.72, 0.42]);
    if (isRevealView(view)) {
      // V37.5: real reveal starts with model-viewer lighting low, not just a black overlay.
      return { exposure: '0.08', shadow: '0.88', env: 'neutral', finalExposure: Number(pair[0]), finalShadow: Number(pair[1]) };
    }
    return { exposure: String(pair[0]), shadow: String(pair[1]), env: 'neutral', finalExposure: Number(pair[0]), finalShadow: Number(pair[1]) };
  }
  function lightingAttrs(cfg, view) {
    const lc = lightingConfig(cfg, view);
    return 'shadow-intensity="' + lc.shadow + '" exposure="' + lc.exposure + '" environment-image="' + lc.env + '"';
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.meshy3d-root{position:relative;width:100%;height:100%;min-height:132px;overflow:hidden;border-radius:inherit;contain:layout paint;isolation:isolate;--sassi-model-bg1:rgba(133,210,221,.28);--sassi-model-bg2:rgba(17,86,108,.20);--sassi-soft-shadow:rgba(0,28,38,.20);}
.meshy3d-shell{position:absolute;inset:0;overflow:hidden;border-radius:inherit;background:radial-gradient(circle at 46% 24%,rgba(255,255,245,.34),rgba(255,255,255,0) 38%),linear-gradient(180deg,var(--sassi-model-bg1),var(--sassi-model-bg2));}
.meshy3d-viewer{position:absolute;inset:-4% -6% -5% -6%;width:112%;height:109%;background:transparent;--poster-color:transparent;filter:drop-shadow(0 14px 16px var(--sassi-soft-shadow)) saturate(.96) contrast(.98);}
.meshy3d-root[data-view="portrait"] .meshy3d-viewer{inset:-1% -5% -7% -5%;width:110%;height:110%;}
.meshy3d-root[data-view="menu"] .meshy3d-viewer{inset:-7% -9% -10% -9%;width:118%;height:118%;}
.meshy3d-root[data-view="ranking"] .meshy3d-viewer{inset:-16% -18% -18% -18%;width:136%;height:136%;filter:drop-shadow(0 8px 10px var(--sassi-soft-shadow)) saturate(.98) contrast(1.02);}
.meshy3d-root[data-view="cinema"] .meshy3d-viewer,.meshy3d-root[data-view="result"] .meshy3d-viewer{inset:-10% -8% -11% -8%;width:116%;height:121%;}
.meshy3d-shadow{position:absolute;left:30%;right:30%;bottom:8%;height:14%;border-radius:999px;background:radial-gradient(ellipse,rgba(0,28,32,.20),rgba(0,0,0,0) 72%);filter:blur(3px);z-index:0;}
.meshy3d-status-note{position:absolute;left:50%;bottom:5px;z-index:3;transform:translateX(-50%);padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.62);color:#31536a;font:700 10px/1 system-ui,sans-serif;letter-spacing:.03em;opacity:0;pointer-events:none;transition:opacity .18s ease;}
.meshy3d-root.is-reaction .meshy3d-status-note{opacity:.58;}
.meshy3d-root.is-returning .meshy3d-status-note{opacity:.38;}
.meshy3d-root.is-manual .meshy3d-status-note{opacity:.78;background:rgba(255,255,255,.78);color:#7a4a12;}
.meshy3d-root.is-locked .meshy3d-status-note{opacity:.48;}
.meshy3d-root[data-character="bruno-basalto"]{--sassi-model-bg1:rgba(232,204,161,.34);--sassi-model-bg2:rgba(105,83,62,.22);--sassi-soft-shadow:rgba(41,28,18,.24);}
.meshy3d-root[data-character="mara-selce"]{--sassi-model-bg1:rgba(197,226,217,.32);--sassi-model-bg2:rgba(64,99,105,.22);--sassi-soft-shadow:rgba(17,45,49,.24);}
.meshy3d-root[data-character="teo-pietrafocaia"]{--sassi-model-bg1:rgba(255,200,126,.30);--sassi-model-bg2:rgba(132,48,34,.24);--sassi-soft-shadow:rgba(66,22,11,.24);}
.meshy3d-root[data-character="lalla-lapillo"]{--sassi-model-bg1:rgba(255,168,128,.30);--sassi-model-bg2:rgba(109,34,67,.22);--sassi-soft-shadow:rgba(60,17,32,.24);}
.meshy3d-root[data-character="orbo-granito"]{--sassi-model-bg1:rgba(176,218,162,.30);--sassi-model-bg2:rgba(57,93,71,.24);--sassi-soft-shadow:rgba(20,45,30,.24);}
.meshy3d-root[data-character="zelda-quarzo"]{--sassi-model-bg1:rgba(209,222,255,.34);--sassi-model-bg2:rgba(89,82,158,.22);--sassi-soft-shadow:rgba(30,29,74,.24);}
.meshy3d-root[data-character="prof-ossidiana"]{--sassi-model-bg1:rgba(190,214,204,.30);--sassi-model-bg2:rgba(45,77,71,.24);--sassi-soft-shadow:rgba(13,38,34,.24);}
.meshy3d-root[data-character="imperio"]{--sassi-model-bg1:rgba(237,216,172,.32);--sassi-model-bg2:rgba(96,77,54,.24);--sassi-soft-shadow:rgba(45,31,18,.24);}
.meshy-arena-stage{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:linear-gradient(180deg,#dff8f1 0%,#a5dfd0 40%,#6eb98b 100%);--ground1:#79bd7f;--ground2:#438b61;--ground3:#337750;--mid1:#3f8e65;--mid2:#2f7e5a;--far1:#95c9c0;--far2:#6aa898;--river1:#2fa9bf;--river2:#b9f6ff;--riverOpacity:.78;}
.meshy-arena-stage[data-env="quarry"]{background:linear-gradient(180deg,#f2ddb6 0%,#cfaa78 45%,#8f7158 100%);--ground1:#b89563;--ground2:#826347;--ground3:#5f4937;--mid1:#8c7559;--mid2:#735b43;--far1:#c3ad8a;--far2:#8e765a;--riverOpacity:0;}
.meshy-arena-stage[data-env="ravine"]{background:linear-gradient(180deg,#d7ece8 0%,#9fc0ba 43%,#607d78 100%);--ground1:#7f9a8a;--ground2:#526f66;--ground3:#374f49;--mid1:#6d8984;--mid2:#4c6968;--far1:#a8bcb9;--far2:#748b8a;--riverOpacity:.20;}
.meshy-arena-stage[data-env="forge"]{background:linear-gradient(180deg,#ffd59a 0%,#b76745 48%,#5c3230 100%);--ground1:#9a6548;--ground2:#704036;--ground3:#49282a;--mid1:#a44c31;--mid2:#723125;--far1:#d09866;--far2:#9b553f;--riverOpacity:0;}
.meshy-arena-stage[data-env="volcano-dance"]{background:linear-gradient(180deg,#f7b184 0%,#a44a5c 45%,#432346 100%);--ground1:#a65b50;--ground2:#6b3045;--ground3:#341f37;--mid1:#c2604e;--mid2:#7e3140;--far1:#c78a79;--far2:#86475c;--riverOpacity:0;}
.meshy-arena-stage[data-env="moss-ruins"]{background:linear-gradient(180deg,#d8edd0 0%,#8eb685 45%,#4d765d 100%);--ground1:#7eac6c;--ground2:#4f7b55;--ground3:#345c3f;--mid1:#668a64;--mid2:#466a4f;--far1:#a0bd92;--far2:#6f916d;--riverOpacity:0;}
.meshy-arena-stage[data-env="crystal-cave"]{background:linear-gradient(180deg,#dfe7ff 0%,#a8b5e8 45%,#6066a5 100%);--ground1:#8ea4d9;--ground2:#666faf;--ground3:#464684;--mid1:#88a2d8;--mid2:#6575b7;--far1:#bac7f5;--far2:#8795d0;--riverOpacity:.12;}
.meshy-arena-stage[data-env="blackboard"]{background:linear-gradient(180deg,#d9eadf 0%,#7aa08f 45%,#304e48 100%);--ground1:#6d8f76;--ground2:#466657;--ground3:#263f39;--mid1:#4d7168;--mid2:#31564f;--far1:#adc9b9;--far2:#6e9585;--riverOpacity:0;}
.meshy-arena-stage[data-env="old-camp"]{background:linear-gradient(180deg,#eedcb3 0%,#b98f62 45%,#6b513b 100%);--ground1:#b88952;--ground2:#805f40;--ground3:#533b2b;--mid1:#92764d;--mid2:#6e5438;--far1:#c6ad82;--far2:#917556;--riverOpacity:0;}
.meshy-arena-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 42% 10%,rgba(255,252,214,.48),rgba(255,255,255,0) 31%),linear-gradient(180deg,rgba(22,88,102,.05),rgba(8,54,45,.15));z-index:8;pointer-events:none;mix-blend-mode:multiply;opacity:.62;}
.meshy-sky-glow{position:absolute;left:-8%;right:-8%;top:-12%;height:48%;z-index:0;background:radial-gradient(circle at 46% 18%,rgba(255,252,214,.62),rgba(255,255,255,0) 29%),linear-gradient(180deg,rgba(255,255,255,.32),rgba(255,255,255,0) 80%);}
.meshy-mountain-layer{position:absolute;left:-10%;right:-10%;bottom:47%;height:30%;z-index:1;background:linear-gradient(180deg,var(--far1),var(--far2));clip-path:polygon(0 74%,9% 58%,18% 69%,29% 42%,39% 66%,50% 37%,62% 64%,73% 48%,84% 66%,100% 50%,100% 100%,0 100%);opacity:.78;}
.meshy-tree-layer{position:absolute;left:-9%;right:-9%;bottom:37%;height:24%;z-index:2;background:radial-gradient(ellipse at 8% 72%,var(--mid1) 0 10%,transparent 11%),radial-gradient(ellipse at 18% 60%,var(--mid2) 0 12%,transparent 13%),radial-gradient(ellipse at 31% 66%,var(--mid1) 0 11%,transparent 12%),radial-gradient(ellipse at 45% 60%,var(--mid2) 0 13%,transparent 14%),radial-gradient(ellipse at 58% 67%,var(--mid1) 0 11%,transparent 12%),radial-gradient(ellipse at 71% 58%,var(--mid2) 0 13%,transparent 14%),radial-gradient(ellipse at 86% 66%,var(--mid1) 0 12%,transparent 13%),linear-gradient(180deg,transparent 0 42%,var(--mid2) 43% 100%);opacity:.88;}
.meshy-river-bg{position:absolute;left:-6%;right:-6%;bottom:28%;height:16%;z-index:3;background:repeating-linear-gradient(0deg,rgba(255,255,255,.56) 0 4px,rgba(255,255,255,0) 5px 14px),linear-gradient(90deg,var(--river1) 0%,var(--river2) 46%,var(--river1) 100%);transform:skewY(-2deg);box-shadow:0 10px 18px rgba(0,65,74,.16),inset 0 10px 20px rgba(255,255,255,.20);opacity:var(--riverOpacity);}
.meshy-arena-stage{--s3d-stage-bright:1;--s3d-stage-sat:1;--s3d-reveal-character-opacity:1;--s3d-reveal-vfx:0;--s3d-blackgate:0;}
.meshy-arena-stage[data-reveal="true"]{--s3d-blackgate:1;--s3d-reveal-character-opacity:0;--s3d-stage-bright:.08;--s3d-stage-sat:.32;--s3d-reveal-vfx:0;}
.meshy-sky-glow,.meshy-mountain-layer,.meshy-tree-layer,.meshy-env-backdrop,.meshy-env-detail,.meshy-env-air,.meshy-river-bg,.meshy-ground-floor,.meshy-foot-grass,.meshy-spark{filter:brightness(var(--s3d-stage-bright)) saturate(var(--s3d-stage-sat));transition:filter .18s linear;}
.meshy-env-backdrop{position:absolute;left:-9%;right:-9%;bottom:39%;height:24%;z-index:2;opacity:.70;pointer-events:none;}
.meshy-env-detail{position:absolute;left:-8%;right:-8%;bottom:31%;height:23%;z-index:3;opacity:.78;pointer-events:none;}
.meshy-env-air{position:absolute;inset:0;z-index:5;opacity:.32;pointer-events:none;mix-blend-mode:screen;}
.meshy-arena-stage[data-env="stream"] .meshy-env-backdrop{background:radial-gradient(ellipse at 18% 70%,rgba(73,134,77,.58) 0 8%,transparent 9%),radial-gradient(ellipse at 84% 64%,rgba(55,122,78,.56) 0 10%,transparent 11%),linear-gradient(180deg,transparent 0 42%,rgba(45,104,72,.42) 44% 100%);}
.meshy-arena-stage[data-env="quarry"] .meshy-env-backdrop{background:radial-gradient(ellipse at 16% 86%,rgba(91,72,51,.72) 0 18%,transparent 19%),radial-gradient(ellipse at 48% 76%,rgba(122,94,61,.75) 0 24%,transparent 25%),radial-gradient(ellipse at 82% 82%,rgba(92,69,48,.74) 0 20%,transparent 21%);}
.meshy-arena-stage[data-env="quarry"] .meshy-env-detail{background:radial-gradient(ellipse at 21% 83%,rgba(68,50,38,.50) 0 10%,transparent 11%),radial-gradient(ellipse at 74% 84%,rgba(87,62,45,.42) 0 12%,transparent 13%);}
.meshy-arena-stage[data-env="ravine"] .meshy-env-backdrop{background:linear-gradient(102deg,rgba(66,84,83,.70) 0 13%,transparent 14% 84%,rgba(55,76,76,.68) 85% 100%),radial-gradient(ellipse at 50% 78%,rgba(134,168,161,.32) 0 32%,transparent 33%);}
.meshy-arena-stage[data-env="forge"] .meshy-env-backdrop{background:radial-gradient(circle at 22% 80%,rgba(255,126,48,.42) 0 10%,transparent 24%),radial-gradient(circle at 78% 78%,rgba(255,91,38,.36) 0 9%,transparent 23%),linear-gradient(180deg,transparent 0 48%,rgba(61,30,26,.64) 49% 100%);}
.meshy-arena-stage[data-env="forge"] .meshy-env-air{background:repeating-linear-gradient(88deg,transparent 0 30px,rgba(255,177,80,.20) 31px 32px,transparent 33px 66px);}
.meshy-arena-stage[data-env="volcano-dance"] .meshy-env-backdrop{background:radial-gradient(ellipse at 50% 72%,rgba(255,100,52,.34) 0 20%,transparent 42%),linear-gradient(112deg,transparent 0 18%,rgba(83,38,63,.50) 19% 36%,transparent 37% 64%,rgba(90,38,60,.54) 65% 82%,transparent 83% 100%);}
.meshy-arena-stage[data-env="volcano-dance"] .meshy-env-detail{background:radial-gradient(circle at 18% 84%,rgba(255,147,67,.42) 0 5%,transparent 6%),radial-gradient(circle at 82% 82%,rgba(255,105,68,.40) 0 6%,transparent 7%);}
.meshy-arena-stage[data-env="moss-ruins"] .meshy-env-backdrop{background:linear-gradient(90deg,transparent 0 12%,rgba(80,91,71,.66) 13% 18%,transparent 19% 39%,rgba(76,88,69,.62) 40% 46%,transparent 47% 68%,rgba(75,88,72,.64) 69% 75%,transparent 76% 100%),linear-gradient(180deg,transparent 0 50%,rgba(70,108,74,.42) 51% 100%);}
.meshy-arena-stage[data-env="moss-ruins"] .meshy-env-detail{background:radial-gradient(ellipse at 22% 84%,rgba(100,166,80,.44) 0 11%,transparent 12%),radial-gradient(ellipse at 74% 82%,rgba(88,145,73,.40) 0 13%,transparent 14%);}
.meshy-arena-stage[data-env="crystal-cave"] .meshy-env-backdrop{background:linear-gradient(130deg,transparent 0 18%,rgba(174,206,255,.48) 19% 26%,transparent 27% 44%,rgba(141,168,238,.46) 45% 55%,transparent 56% 72%,rgba(192,219,255,.50) 73% 82%,transparent 83% 100%);}
.meshy-arena-stage[data-env="crystal-cave"] .meshy-env-air{background:radial-gradient(circle at 35% 30%,rgba(201,231,255,.24),transparent 16%),radial-gradient(circle at 73% 37%,rgba(190,205,255,.20),transparent 18%);}
.meshy-arena-stage[data-env="blackboard"] .meshy-env-backdrop{background:linear-gradient(180deg,rgba(21,56,52,.66),rgba(31,76,68,.34)),repeating-linear-gradient(0deg,transparent 0 30px,rgba(255,255,255,.10) 31px 32px),repeating-linear-gradient(90deg,transparent 0 44px,rgba(255,255,255,.07) 45px 46px);}
.meshy-arena-stage[data-env="old-camp"] .meshy-env-backdrop{background:radial-gradient(circle at 70% 82%,rgba(255,154,68,.32) 0 8%,transparent 24%),linear-gradient(118deg,transparent 0 16%,rgba(99,72,48,.58) 17% 31%,transparent 32% 67%,rgba(111,79,49,.54) 68% 82%,transparent 83% 100%);}
.meshy-arena-stage[data-reveal="true"] .meshy-arena-character{opacity:var(--s3d-reveal-character-opacity);transition:opacity .08s linear;}
.meshy-reveal-light,.meshy-reveal-fog{display:none;position:absolute;pointer-events:none;}
.meshy-arena-stage[data-reveal="true"] .meshy-reveal-light{display:block;z-index:9;inset:-10%;opacity:var(--s3d-reveal-vfx);mix-blend-mode:screen;filter:blur(6px);}
.meshy-arena-stage[data-reveal="true"] .meshy-reveal-light.v1{background:radial-gradient(ellipse at 50% 45%,rgba(255,238,170,.72) 0 8%,rgba(255,220,120,.24) 22%,transparent 48%);}
.meshy-arena-stage[data-reveal="true"] .meshy-reveal-light.v2{background:linear-gradient(100deg,transparent 0 35%,rgba(255,248,205,.34) 49%,transparent 65% 100%);animation:s3dRevealBeamSweep 3.2s cubic-bezier(.14,.82,.18,1) both;}
.meshy-arena-stage[data-reveal="true"] .meshy-reveal-fog{display:block;z-index:10;left:-10%;right:-10%;bottom:0;height:45%;opacity:calc(var(--s3d-reveal-vfx) * .55);background:radial-gradient(ellipse at 50% 80%,rgba(255,255,255,.32),transparent 42%),repeating-linear-gradient(0deg,rgba(255,255,255,.045) 0 2px,transparent 3px 13px);animation:s3dRevealFogDrift 4.4s ease-out both;}
@keyframes s3dRevealBeamSweep{0%{transform:translateX(-34%) skewX(-9deg);opacity:0}28%{opacity:.9}72%{opacity:.35}100%{transform:translateX(34%) skewX(-9deg);opacity:0}}
@keyframes s3dRevealFogDrift{0%{transform:translateY(18px)}100%{transform:translateY(-12px)}}

/* V37.6 — clean ambient motion + black gate.
   Mobile-safe: animated properties are transform/opacity/filter only; no layout-affecting animation. */
.meshy-arena-stage{--s3d-blackgate:0;}
.meshy-arena-stage[data-reveal="true"]{--s3d-blackgate:1;--s3d-reveal-character-opacity:0;}
.meshy-black-gate{position:absolute;z-index:99;inset:-24%;display:block;pointer-events:none;background:#000;opacity:var(--s3d-blackgate);transition:opacity .08s linear;}
.meshy-foot-grass{display:none !important;}
.meshy-spark{display:block !important;position:absolute;width:4px;height:4px;border-radius:999px;background:rgba(255,236,177,.62);box-shadow:0 0 10px rgba(255,226,153,.45);opacity:.22;z-index:6;animation:s3dAmbientMote 7.2s ease-in-out infinite;will-change:transform,opacity;}
.meshy-spark.s1{left:18%;top:42%;animation-delay:.1s}
.meshy-spark.s2{left:76%;top:38%;animation-delay:1.2s}
.meshy-spark.s3{left:31%;top:68%;animation-delay:2.3s}
.meshy-spark.s4{left:63%;top:62%;animation-delay:3.1s}
.meshy-env-backdrop,.meshy-env-detail,.meshy-env-air,.meshy-river-bg,.meshy-ground-floor{will-change:transform,opacity,filter;transform:translate3d(0,0,0);}
.meshy-env-backdrop{animation:s3dBackdropBreath 16s ease-in-out infinite;}
.meshy-env-detail{animation:s3dMidLayerDrift 11s ease-in-out infinite alternate;}
.meshy-env-air{animation:s3dAirSlowDrift 9s ease-in-out infinite alternate;}
.meshy-ground-floor{animation:s3dGroundBreath 14s ease-in-out infinite;}
.meshy-river-bg{animation:s3dRiverFlow 6.2s linear infinite;}
.meshy-arena-stage[data-env="stream"] .meshy-env-air{background:radial-gradient(circle at 18% 34%,rgba(169,230,255,.20),transparent 18%),radial-gradient(circle at 78% 45%,rgba(180,255,215,.16),transparent 16%);}
.meshy-arena-stage[data-env="stream"] .meshy-spark{background:rgba(202,255,232,.58);box-shadow:0 0 12px rgba(110,231,255,.46);}
.meshy-arena-stage[data-env="stream"] .meshy-river-bg{opacity:.76;}
.meshy-arena-stage[data-env="quarry"] .meshy-env-air{background:radial-gradient(ellipse at 20% 72%,rgba(218,178,112,.15),transparent 22%),radial-gradient(ellipse at 74% 64%,rgba(238,208,160,.12),transparent 22%);}
.meshy-arena-stage[data-env="quarry"] .meshy-spark{background:rgba(229,190,132,.50);box-shadow:0 0 10px rgba(224,161,91,.30);}
.meshy-arena-stage[data-env="ravine"] .meshy-env-air{background:linear-gradient(100deg,transparent 0 22%,rgba(198,232,226,.12) 36%,transparent 54% 100%);animation:s3dWindSheet 8s ease-in-out infinite alternate;}
.meshy-arena-stage[data-env="ravine"] .meshy-spark{opacity:.15;background:rgba(215,242,238,.46);}
.meshy-arena-stage[data-env="forge"] .meshy-env-air{animation:s3dForgeHeat 3.8s ease-in-out infinite;background:radial-gradient(circle at 26% 72%,rgba(255,122,55,.26),transparent 19%),radial-gradient(circle at 78% 70%,rgba(255,182,84,.20),transparent 18%);}
.meshy-arena-stage[data-env="forge"] .meshy-spark{background:rgba(255,180,82,.70);box-shadow:0 0 16px rgba(255,110,40,.68);animation:s3dForgeEmber 4.4s ease-in-out infinite;}
.meshy-arena-stage[data-env="volcano-dance"] .meshy-env-air{animation:s3dLavaPulse 4.6s ease-in-out infinite;background:radial-gradient(ellipse at 50% 76%,rgba(255,99,57,.28),transparent 33%);}
.meshy-arena-stage[data-env="volcano-dance"] .meshy-spark{background:rgba(255,121,68,.62);box-shadow:0 0 16px rgba(255,86,52,.54);animation:s3dForgeEmber 5s ease-in-out infinite;}
.meshy-arena-stage[data-env="moss-ruins"] .meshy-env-air{background:radial-gradient(ellipse at 20% 76%,rgba(145,210,126,.15),transparent 24%),radial-gradient(ellipse at 78% 72%,rgba(114,190,121,.13),transparent 24%);}
.meshy-arena-stage[data-env="moss-ruins"] .meshy-spark{background:rgba(168,235,151,.50);box-shadow:0 0 12px rgba(121,220,130,.34);}
.meshy-arena-stage[data-env="crystal-cave"] .meshy-env-detail{animation:s3dCrystalShimmer 5.8s ease-in-out infinite alternate;}
.meshy-arena-stage[data-env="crystal-cave"] .meshy-spark{background:rgba(204,230,255,.68);box-shadow:0 0 16px rgba(158,185,255,.66);animation:s3dCrystalMote 6.4s ease-in-out infinite;}
.meshy-arena-stage[data-env="blackboard"] .meshy-env-air{background:radial-gradient(ellipse at 50% 70%,rgba(230,239,214,.10),transparent 28%);animation:s3dChalkDust 10s ease-in-out infinite alternate;}
.meshy-arena-stage[data-env="blackboard"] .meshy-spark{background:rgba(233,241,219,.42);box-shadow:0 0 8px rgba(230,241,222,.25);opacity:.18;}
.meshy-arena-stage[data-env="old-camp"] .meshy-env-air{background:radial-gradient(circle at 72% 78%,rgba(255,160,82,.22),transparent 18%),radial-gradient(circle at 28% 72%,rgba(255,204,128,.09),transparent 22%);animation:s3dCampfireBreath 3.6s ease-in-out infinite;}
.meshy-arena-stage[data-env="old-camp"] .meshy-spark{background:rgba(255,183,101,.62);box-shadow:0 0 14px rgba(255,116,45,.44);animation:s3dForgeEmber 5.6s ease-in-out infinite;}

@keyframes s3dBackdropBreath{0%,100%{transform:translate3d(0,0,0) scale(1);opacity:.70}50%{transform:translate3d(.4%,-.35%,0) scale(1.012);opacity:.78}}
@keyframes s3dMidLayerDrift{0%{transform:translate3d(-.45%,0,0);opacity:.72}100%{transform:translate3d(.55%,-.45%,0);opacity:.84}}
@keyframes s3dAirSlowDrift{0%{transform:translate3d(-1.3%,.6%,0);opacity:.20}100%{transform:translate3d(1.1%,-.9%,0);opacity:.38}}
@keyframes s3dGroundBreath{0%,100%{transform:translate3d(0,0,0);filter:brightness(var(--s3d-stage-bright)) saturate(var(--s3d-stage-sat))}50%{transform:translate3d(0,-.25%,0);filter:brightness(calc(var(--s3d-stage-bright) * 1.035)) saturate(calc(var(--s3d-stage-sat) * 1.02))}}
@keyframes s3dRiverFlow{0%{transform:translate3d(-2%,0,0) skewY(-2deg)}100%{transform:translate3d(2%,0,0) skewY(-2deg)}}
@keyframes s3dAmbientMote{0%,100%{opacity:.12;transform:translate3d(0,10px,0) scale(.78)}42%{opacity:.36;transform:translate3d(7px,-10px,0) scale(1.12)}72%{opacity:.20;transform:translate3d(-5px,-18px,0) scale(.96)}}
@keyframes s3dForgeEmber{0%,100%{opacity:.10;transform:translate3d(0,14px,0) scale(.65)}36%{opacity:.78;transform:translate3d(4px,-10px,0) scale(1.05)}72%{opacity:.22;transform:translate3d(-6px,-26px,0) scale(.85)}}
@keyframes s3dForgeHeat{0%,100%{opacity:.16;transform:translate3d(-.8%,.5%,0) scale(1)}50%{opacity:.34;transform:translate3d(.8%,-.4%,0) scale(1.035)}}
@keyframes s3dLavaPulse{0%,100%{opacity:.20;filter:brightness(1) saturate(1)}50%{opacity:.42;filter:brightness(1.16) saturate(1.12)}}
@keyframes s3dCrystalShimmer{0%{opacity:.48;filter:brightness(1) saturate(1)}38%{opacity:.82;filter:brightness(1.22) saturate(1.12)}100%{opacity:.58;filter:brightness(1.04) saturate(1.06)}}
@keyframes s3dCrystalMote{0%,100%{opacity:.16;transform:translate3d(0,7px,0) scale(.82)}50%{opacity:.54;transform:translate3d(5px,-12px,0) scale(1.1)}}
@keyframes s3dWindSheet{0%{opacity:.14;transform:translate3d(-4%,0,0)}100%{opacity:.33;transform:translate3d(4%,-.8%,0)}}
@keyframes s3dChalkDust{0%{opacity:.10;transform:translate3d(-1%,1%,0)}100%{opacity:.25;transform:translate3d(1.2%,-1%,0)}}
@keyframes s3dCampfireBreath{0%,100%{opacity:.18;filter:brightness(1)}48%{opacity:.42;filter:brightness(1.22)}}

@media (prefers-reduced-motion: reduce){
  .meshy-env-backdrop,.meshy-env-detail,.meshy-env-air,.meshy-river-bg,.meshy-ground-floor,.meshy-spark{
    animation:none !important;
  }
}


.meshy-ground-floor{position:absolute;left:-8%;right:-8%;bottom:-8%;height:43%;z-index:4;background:radial-gradient(ellipse at 50% 10%,rgba(255,255,255,.18),rgba(255,255,255,0) 38%),linear-gradient(180deg,var(--ground1),var(--ground2) 65%,var(--ground3));box-shadow:inset 0 18px 22px rgba(255,255,255,.10);}
.meshy-foot-grass{position:absolute;left:31%;right:31%;bottom:6%;height:12%;z-index:7;opacity:.82;background:repeating-linear-gradient(92deg,transparent 0 6px,rgba(225,255,198,.72) 7px 9px,transparent 10px 15px),radial-gradient(ellipse at 50% 88%,rgba(18,83,40,.25),rgba(0,0,0,0) 66%);clip-path:polygon(0 100%,4% 62%,8% 100%,13% 48%,18% 100%,24% 58%,30% 100%,36% 42%,43% 100%,50% 52%,57% 100%,64% 45%,70% 100%,77% 58%,84% 100%,91% 48%,96% 100%,100% 66%,100% 100%);filter:drop-shadow(0 4px 5px rgba(0,45,24,.22));pointer-events:none;}
.meshy-spark{position:absolute;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.84);z-index:5;filter:drop-shadow(0 0 5px rgba(255,255,255,.68));animation:meshySpark 3.4s ease-in-out infinite alternate;}.meshy-spark.s1{left:17%;top:62%;animation-delay:.1s}.meshy-spark.s2{right:22%;top:59%;animation-delay:.7s}.meshy-spark.s3{left:48%;bottom:19%;animation-delay:1.3s}.meshy-spark.s4{right:42%;top:73%;animation-delay:1.8s}
.meshy-arena-character{position:absolute;inset:0;z-index:6;}
.meshy-arena-character .meshy3d-root{border-radius:0;min-height:100%;contain:layout paint;--sassi-soft-shadow:rgba(0,28,26,.24);}
.meshy-arena-character .meshy3d-shell{background:transparent;}
.meshy-arena-character .meshy3d-viewer{filter:drop-shadow(0 18px 18px rgba(0,30,28,.24)) saturate(.94) contrast(.96);}
.meshy-arena-character .meshy3d-shadow{bottom:8%;background:radial-gradient(ellipse,rgba(0,34,25,.25),rgba(0,0,0,0) 72%);}
@keyframes meshySpark{from{transform:translateY(0) scale(.75);opacity:.35}to{transform:translateY(-14px) scale(1.05);opacity:.85}}
`;
    style.textContent += `
/* V37.7 reveal first-paint safety */
.meshy3d-root[data-reveal="true"]{opacity:0;}
.meshy-arena-stage[data-reveal="true"].s3d-reveal-prepared .meshy3d-root[data-reveal="true"]{opacity:1;}
.meshy-arena-stage[data-reveal="true"] .meshy-black-gate{opacity:var(--s3d-blackgate,1);}
`;
    style.textContent += `
/* ============================================================
   V37.10 — SVG Backdrops + Sprite FX
   Real 2D/2.5D arena assets, no procedural cylinders.
   ============================================================ */
.meshy-arena-stage.arena-svg-mode{
  --arena-back-bright:1;
  --arena-back-sat:1;
  isolation:isolate;
  background:#16202e;
}
.meshy-arena-stage.arena-svg-mode .arena-svg-backdrop{
  position:absolute;
  inset:-1.5%;
  z-index:1;
  pointer-events:none;
  background-image:var(--arena-svg);
  background-repeat:no-repeat;
  background-position:center center;
  background-size:cover;
  filter:brightness(calc(var(--s3d-stage-bright, 1) * var(--arena-back-bright, 1))) saturate(calc(var(--s3d-stage-sat, 1) * var(--arena-back-sat, 1)));
  transform-origin:50% 58%;
  animation:arenaSvgBreath 14s ease-in-out infinite alternate;
}
.meshy-arena-stage.arena-svg-mode .meshy-sky-glow,
.meshy-arena-stage.arena-svg-mode .meshy-mountain-layer,
.meshy-arena-stage.arena-svg-mode .meshy-tree-layer,
.meshy-arena-stage.arena-svg-mode .meshy-env-backdrop,
.meshy-arena-stage.arena-svg-mode .meshy-env-detail,
.meshy-arena-stage.arena-svg-mode .meshy-env-air,
.meshy-arena-stage.arena-svg-mode .meshy-river-bg,
.meshy-arena-stage.arena-svg-mode .meshy-ground-floor,
.meshy-arena-stage.arena-svg-mode .meshy-spark,
.meshy-arena-stage.arena-svg-mode .meshy-foot-grass{
  display:none !important;
}
.meshy-arena-stage.arena-svg-mode .arena-sprite-fx{
  position:absolute;
  inset:0;
  z-index:4;
  pointer-events:none;
  overflow:hidden;
  opacity:calc(.88 * var(--s3d-stage-bright, 1));
}
.meshy-arena-stage.arena-svg-mode .fx-sprite{
  position:absolute;
  display:block;
  width:54px;
  height:54px;
  background-image:var(--fx-img);
  background-repeat:no-repeat;
  background-position:center;
  background-size:contain;
  opacity:0;
  filter:drop-shadow(0 0 10px rgba(255,255,255,.18));
  will-change:transform, opacity;
}
.meshy-arena-stage.arena-svg-mode .meshy-arena-character{z-index:8 !important;}
.meshy-arena-stage.arena-svg-mode .meshy-reveal-light,
.meshy-arena-stage.arena-svg-mode .meshy-reveal-fog,
.meshy-arena-stage.arena-svg-mode .meshy-black-gate{z-index:12;}

.arena-sprite-fx.fx-stream .fx1{left:18%;bottom:24%;width:130px;height:42px;animation:fxWater 5.6s linear infinite;}
.arena-sprite-fx.fx-stream .fx2{left:74%;top:32%;width:28px;height:28px;animation:fxTwinkle 4.8s ease-in-out infinite .8s;}
.arena-sprite-fx.fx-stream .fx3{left:4%;top:46%;width:230px;height:88px;animation:fxWispSide 9s ease-in-out infinite;}

.arena-sprite-fx.fx-quarry .fx1{left:12%;top:42%;width:38px;height:38px;animation:fxDust 7s ease-in-out infinite;}
.arena-sprite-fx.fx-quarry .fx2{right:10%;top:38%;width:34px;height:34px;animation:fxDust 8.2s ease-in-out infinite 1.4s;}
.arena-sprite-fx.fx-quarry .fx3{left:68%;top:58%;width:180px;height:72px;animation:fxWispSide 10s ease-in-out infinite .6s;}

.arena-sprite-fx.fx-ravine .fx1{left:3%;top:39%;width:250px;height:90px;animation:fxWindLeft 8s linear infinite;}
.arena-sprite-fx.fx-ravine .fx2{right:4%;top:52%;width:250px;height:90px;animation:fxWindRight 9s linear infinite .9s;}
.arena-sprite-fx.fx-ravine .fx3{left:70%;top:28%;width:25px;height:25px;animation:fxTwinkle 5s ease-in-out infinite 1.3s;}

.arena-sprite-fx.fx-forge .fx1{right:25%;bottom:23%;width:42px;height:42px;animation:fxEmberRise 4.5s ease-in-out infinite;}
.arena-sprite-fx.fx-forge .fx2{right:18%;bottom:27%;width:34px;height:34px;animation:fxEmberRise 5.1s ease-in-out infinite .9s;}
.arena-sprite-fx.fx-forge .fx3{left:28%;top:34%;width:74px;height:140px;animation:fxHeat 3.2s ease-in-out infinite;}

.arena-sprite-fx.fx-volcano-dance .fx1{left:22%;bottom:24%;width:38px;height:38px;animation:fxLavaPop 4.4s ease-in-out infinite;}
.arena-sprite-fx.fx-volcano-dance .fx2{right:24%;bottom:26%;width:36px;height:36px;animation:fxEmberRise 4.8s ease-in-out infinite .7s;}
.arena-sprite-fx.fx-volcano-dance .fx3{left:74%;top:29%;width:30px;height:30px;animation:fxTwinkle 3.8s ease-in-out infinite;}

.arena-sprite-fx.fx-moss-ruins .fx1{left:5%;top:52%;width:240px;height:90px;animation:fxWispSide 12s ease-in-out infinite;}
.arena-sprite-fx.fx-moss-ruins .fx2{right:18%;top:34%;width:26px;height:26px;animation:fxTwinkle 6s ease-in-out infinite .8s;}
.arena-sprite-fx.fx-moss-ruins .fx3{left:17%;top:36%;width:34px;height:34px;animation:fxDust 9s ease-in-out infinite;}

.arena-sprite-fx.fx-crystal-cave .fx1{left:22%;top:25%;width:32px;height:32px;animation:fxCrystalGlint 3.8s ease-in-out infinite;}
.arena-sprite-fx.fx-crystal-cave .fx2{right:18%;top:31%;width:36px;height:36px;animation:fxCrystalGlint 4.6s ease-in-out infinite .9s;}
.arena-sprite-fx.fx-crystal-cave .fx3{left:66%;top:58%;width:26px;height:26px;animation:fxTwinkle 5.6s ease-in-out infinite .4s;}

.arena-sprite-fx.fx-blackboard .fx1{left:25%;top:31%;width:34px;height:34px;animation:fxChalkDust 7.4s ease-in-out infinite;}
.arena-sprite-fx.fx-blackboard .fx2{right:24%;top:46%;width:32px;height:32px;animation:fxChalkDust 8.1s ease-in-out infinite .8s;}
.arena-sprite-fx.fx-blackboard .fx3{left:72%;top:28%;width:24px;height:24px;animation:fxTwinkle 6s ease-in-out infinite 1.1s;}

.arena-sprite-fx.fx-old-camp .fx1{right:26%;bottom:28%;width:38px;height:38px;animation:fxEmberRise 4.8s ease-in-out infinite;}
.arena-sprite-fx.fx-old-camp .fx2{right:18%;bottom:24%;width:32px;height:32px;animation:fxEmberRise 5.5s ease-in-out infinite .8s;}
.arena-sprite-fx.fx-old-camp .fx3{left:8%;top:55%;width:220px;height:80px;animation:fxWispSide 12s ease-in-out infinite;}

@keyframes arenaSvgBreath{from{transform:scale(1.006) translate3d(-.35%,0,0)}to{transform:scale(1.018) translate3d(.35%,-.25%,0)}}
@keyframes fxWater{0%{opacity:0;transform:translateX(-30px) scaleX(.85)}22%{opacity:.55}70%{opacity:.32}100%{opacity:0;transform:translateX(120px) scaleX(1.08)}}
@keyframes fxTwinkle{0%,100%{opacity:0;transform:scale(.45) rotate(0deg)}42%{opacity:.85;transform:scale(1.08) rotate(35deg)}}
@keyframes fxWispSide{0%{opacity:0;transform:translateX(-30px) translateY(12px) scale(.94)}30%{opacity:.32}70%{opacity:.22}100%{opacity:0;transform:translateX(40px) translateY(-8px) scale(1.03)}}
@keyframes fxDust{0%,100%{opacity:0;transform:translate3d(0,20px,0) scale(.62)}38%{opacity:.42}70%{opacity:.18;transform:translate3d(18px,-22px,0) scale(1.04)}}
@keyframes fxWindLeft{0%{opacity:0;transform:translateX(-80px)}35%{opacity:.30}100%{opacity:0;transform:translateX(120px)}}
@keyframes fxWindRight{0%{opacity:0;transform:translateX(90px) scaleX(-1)}35%{opacity:.24}100%{opacity:0;transform:translateX(-130px) scaleX(-1)}}
@keyframes fxEmberRise{0%{opacity:0;transform:translateY(24px) scale(.45) rotate(-12deg)}25%{opacity:.82}100%{opacity:0;transform:translateY(-82px) scale(.95) rotate(24deg)}}
@keyframes fxHeat{0%,100%{opacity:.06;transform:translateY(8px) skewX(-4deg) scaleY(.96)}50%{opacity:.30;transform:translateY(-8px) skewX(4deg) scaleY(1.04)}}
@keyframes fxLavaPop{0%,100%{opacity:0;transform:translateY(16px) scale(.42)}36%{opacity:.8;transform:translateY(-18px) scale(.9)}70%{opacity:.25;transform:translateY(-40px) scale(.55)}}
@keyframes fxCrystalGlint{0%,100%{opacity:0;transform:scale(.35) rotate(0deg)}48%{opacity:.95;transform:scale(1.12) rotate(65deg)}}
@keyframes fxChalkDust{0%,100%{opacity:0;transform:translate3d(0,10px,0) scale(.5)}45%{opacity:.42;transform:translate3d(-14px,-18px,0) scale(.95)}}

@media (prefers-reduced-motion: reduce){
  .meshy-arena-stage.arena-svg-mode .arena-svg-backdrop,
  .meshy-arena-stage.arena-svg-mode .fx-sprite{
    animation:none !important;
  }
}
`;
    document.head.appendChild(style);
  }

  function markup(opponent, mood, view) {
    const cfg = getCfg(opponent);
    if (!cfg) return '';
    const id = idOf(opponent);
    const safeMood = cssMood(mood);
    const rawView = String(view || 'portrait');
    const ctx = normalizedView(rawView);
    const label = cfg.name + ' 3D animato';
    const reveal = isRevealView(rawView);
    const introSpec = cfg.actions && cfg.actions.intro_reveal ? cfg.actions.intro_reveal : null;
    const initialAnim = reveal ? ((introSpec && introSpec.animation) || cfg.idle) : cfg.idle;
    const initialFade = reveal ? 0 : 620;
    return `
      <div class="meshy3d-root mood-${text(safeMood)} ${reveal ? 'is-reveal-root' : ''}" data-character="${text(id)}" data-view="${text(ctx)}" data-raw-view="${text(rawView)}" data-mood="${text(safeMood)}" data-reveal="${reveal ? 'true' : 'false'}" role="img" aria-label="${text((opponent && opponent.name) || cfg.name)}">
        <div class="meshy3d-shell">
          <span class="meshy3d-shadow" aria-hidden="true"></span>
          <model-viewer class="meshy3d-viewer" src="${text(cfg.src)}" loading="${reveal ? 'eager' : 'lazy'}" data-character="${text(id)}" data-mood="${text(safeMood)}" data-view="${text(ctx)}" data-raw-view="${text(rawView)}" data-reveal="${reveal ? 'true' : 'false'}" alt="${text(label)}" autoplay animation-name="${text(initialAnim)}" animation-crossfade-duration="${initialFade}" ${cameraAttrs(cfg, rawView)} ${lightingAttrs(cfg, rawView)} interaction-prompt="none" disable-tap disable-zoom></model-viewer>
          <span class="meshy3d-status-note">anim</span>
        </div>
      </div>`;
  }

  const ANIM_DEFAULTS = Object.freeze({
    // V37.2b: crossfade più calmi. Entrata, ritorno e idle non devono più sembrare "pop" o flash.
    enterFadeMs: 560,
    returnFadeMs: 900,
    idleFadeMs: 720,
    minHoldMs: 720,
    cooldownMs: 360,
    sameReactionThrottleMs: 1050,
    maxReactionMs: 2600,
    maxIntroMs: 3200,
    maxResultMs: 3400,
    manualMaxMs: 12000
  });

  const MOOD_PRIORITY = Object.freeze({
    neutral: 0,
    watch: 0,
    thinking: 20,
    worried: 34,
    sigh: 38,
    smug: 48,
    happy: 52,
    laugh: 52,
    mad: 72,
    angry: 78,
    intro: 92,
    reveal: 94,
    win: 98,
    lose: 98
  });

  function nowMs() { return Date.now ? Date.now() : new Date().getTime(); }

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function getIdle(cfg) {
    return (cfg && cfg.__sassiDebugIdle) || (cfg && cfg.idle) || 'Idle_10';
  }

  function getDuration(cfg, animation, fallback) {
    if (!animation) return fallback || 1400;
    const raw = cfg && cfg.durations && cfg.durations[animation];
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : (fallback || 1400);
  }

  function moodPriority(mood) {
    const safe = cssMood(mood);
    return Object.prototype.hasOwnProperty.call(MOOD_PRIORITY, safe) ? MOOD_PRIORITY[safe] : 42;
  }

  function setStatus(root, label) {
    if (!root) return;
    const note = root.querySelector('.meshy3d-status-note');
    if (note) note.textContent = String(label || 'anim').slice(0, 42);
  }

  function setMoodClass(root, safeMood, ctx) {
    if (!root) return;
    root.dataset.mood = safeMood;
    root.dataset.view = ctx;
    Array.prototype.slice.call(root.classList || []).forEach(function (cls) {
      if (cls.indexOf('mood-') === 0) root.classList.remove(cls);
    });
    root.classList.add('mood-' + safeMood);
  }

  function setCrossfade(viewer, ms) {
    if (!viewer) return;
    const safe = String(Math.max(0, Math.round(Number(ms) || 0)));
    viewer.setAttribute('animation-crossfade-duration', safe);
    try { viewer.animationCrossfadeDuration = Number(safe); } catch (err) {}
  }

  const ACTION_BY_MOOD = Object.freeze({
    neutral: 'idle_default',
    watch: 'watch_neutral',
    thinking: 'thinking',
    worried: 'thinking',
    smug: 'happy_smug',
    happy: 'happy_smug',
    laugh: 'happy_smug',
    mad: 'angry_mad',
    angry: 'angry_mad',
    sigh: 'angry_mad',
    intro: 'intro_reveal',
    reveal: 'intro_reveal',
    win: 'win',
    lose: 'lose'
  });

  function actionKeyForMood(mood) {
    const safe = cssMood(mood);
    return ACTION_BY_MOOD[safe] || 'watch_neutral';
  }

  function specNumber(spec, key, fallback) {
    const n = Number(spec && spec[key]);
    return Number.isFinite(n) ? n : fallback;
  }

  function computeSegmentMs(cfg, spec, actionKey) {
    const anim = spec && spec.animation;
    const full = getDuration(cfg, anim, 1400);
    const minMs = Math.max(0, specNumber(spec, 'minMs', 0));
    const maxMs = Math.max(0, specNumber(spec, 'maxMs', 0));
    const cut = clamp(specNumber(spec, 'cutRatio', .72), .12, 1);

    if (minMs > 0 && maxMs > 0 && minMs === maxMs) return minMs;
    if (maxMs > 0) return Math.max(minMs || 360, maxMs);

    if (actionKey === 'idle_default') return Math.max(600, Math.min(full, 2200));
    if (actionKey === 'intro_reveal') return Math.max(minMs || 520, Math.min(ANIM_DEFAULTS.maxIntroMs, Math.floor(full * cut)));
    if (actionKey === 'win' || actionKey === 'lose') return Math.max(minMs || 700, Math.min(ANIM_DEFAULTS.maxResultMs, Math.floor(full * cut)));
    return Math.max(minMs || 650, Math.min(ANIM_DEFAULTS.maxReactionMs, Math.floor(full * cut)));
  }

  function getPlan(cfg, mood, view) {
    const safe = cssMood(mood);
    const actionKey = actionKeyForMood(safe);
    const idle = getIdle(cfg);
    const spec = cfg && cfg.actions && cfg.actions[actionKey] ? cfg.actions[actionKey] : null;

    if (!spec) {
      return {
        mood: safe,
        actionKey: actionKey,
        animation: idle,
        mode: 'idleLoop',
        loop: true,
        loopWhileActive: true,
        returnIdleOnExit: false,
        returnTo: idle,
        durationMs: 900,
        fullMs: getDuration(cfg, idle, 1400),
        priority: moodPriority(safe),
        minHoldMs: ANIM_DEFAULTS.minHoldMs,
        key: safe + '|idle|' + idle + '|' + normalizedView(view)
      };
    }

    const animation = spec.animation || idle;
    const fullMs = getDuration(cfg, animation, 1400);
    const durationMs = computeSegmentMs(cfg, spec, actionKey);
    const loopWhileActive = !!spec.loopWhileActive || actionKey === 'idle_default';
    const priority = Number.isFinite(Number(spec.priority)) ? Number(spec.priority) : moodPriority(safe);

    return {
      mood: safe,
      actionKey: actionKey,
      animation: animation,
      mode: spec.mode || (loopWhileActive ? 'stateLoop' : 'oneShot'),
      loop: loopWhileActive,
      loopWhileActive: loopWhileActive,
      returnIdleOnExit: !!spec.returnIdleOnExit,
      returnTo: idle,
      durationMs: Math.max(250, durationMs),
      fullMs: fullMs,
      priority: priority,
      minHoldMs: Math.max(250, Math.min(Math.max(250, durationMs), specNumber(spec, 'minMs', ANIM_DEFAULTS.minHoldMs) || Math.min(durationMs, ANIM_DEFAULTS.minHoldMs))),
      key: actionKey + '|' + animation + '|' + normalizedView(view),
      spec: spec
    };
  }

  function getController(viewer) {
    if (!viewer.__sassiAnimController) {
      viewer.__sassiAnimController = {
        state: 'new',
        priority: 0,
        key: '',
        actionKey: '',
        animation: '',
        timers: [],
        lockUntil: 0,
        cycleUntil: 0,
        manualUntil: 0,
        queuedPlan: null,
        lastPlan: null,
        lastMood: '',
        lastIgnored: '',
        serial: 0
      };
    }
    return viewer.__sassiAnimController;
  }

  function clearControllerTimers(viewer) {
    const ctl = getController(viewer);
    (ctl.timers || []).forEach(function (timer) {
      try { window.clearTimeout(timer); } catch (err) {}
    });
    ctl.timers = [];
    viewer.__sassiReturnTimer = null;
  }

  function pushTimer(viewer, fn, ms) {
    const ctl = getController(viewer);
    const timer = window.setTimeout(function () {
      ctl.timers = (ctl.timers || []).filter(function (x) { return x !== timer; });
      fn();
    }, Math.max(0, Number(ms) || 0));
    ctl.timers.push(timer);
    return timer;
  }

  function setViewerAnimation(viewer, animation, opts) {
    if (!viewer || !animation) return;
    const options = opts || {};
    const isSame = viewer.__sassiCurrentAnimation === animation;
    if (isSame) {
      // Safety rule: never overwrite/restart an identical motion.
      try { if (typeof viewer.play === 'function') viewer.play({ repetitions: options.loop ? Infinity : undefined }); } catch (err) {
        try { if (typeof viewer.play === 'function') viewer.play(); } catch (err2) {}
      }
      return;
    }
    if (options.fadeMs != null) setCrossfade(viewer, options.fadeMs);
    viewer.__sassiCurrentAnimation = animation;
    viewer.setAttribute('animation-name', animation);
    try { viewer.animationName = animation; } catch (err) {}
    if (options.restart) { try { viewer.currentTime = 0; } catch (err) {} }
    try {
      if (typeof viewer.play === 'function') viewer.play({ repetitions: options.loop ? Infinity : 1 });
    } catch (err) {
      try { if (typeof viewer.play === 'function') viewer.play(); } catch (err2) {}
    }
  }

  function markRootState(viewer, state, label) {
    const root = viewer && viewer.closest ? viewer.closest('.meshy3d-root') : null;
    if (!root) return null;
    if (state === 'locked') {
      root.classList.add('is-locked');
      if (label) setStatus(root, label);
      return root;
    }
    root.classList.remove('is-locked');
    root.classList.toggle('is-reaction', state === 'stateLoop' || state === 'oneShot' || state === 'queued');
    root.classList.toggle('is-returning', state === 'returning');
    root.classList.toggle('is-manual', state === 'manual');
    if (label) setStatus(root, label);
    return root;
  }

  function finishIdle(viewer) {
    if (!viewer) return;
    const ctl = getController(viewer);
    ctl.state = 'idle';
    ctl.priority = 0;
    ctl.key = 'idle';
    ctl.actionKey = 'idle_default';
    ctl.queuedPlan = null;
    markRootState(viewer, 'idle', 'idle');
  }

  function returnToIdle(viewer, idleName, opts) {
    if (!viewer) return;
    const options = opts || {};
    const ctl = getController(viewer);
    const id = viewer.getAttribute('data-character') || '';
    const cfg = getCfg(id);
    const idle = idleName || getIdle(cfg);
    clearControllerTimers(viewer);
    ctl.state = options.manual ? 'manual-returning' : 'returning';
    ctl.priority = 0;
    ctl.lockUntil = 0;
    ctl.cycleUntil = nowMs() + (options.fadeMs || ANIM_DEFAULTS.returnFadeMs);
    markRootState(viewer, 'returning', 'idle ←');
    setViewerAnimation(viewer, idle, { restart: false, fadeMs: options.fadeMs || ANIM_DEFAULTS.returnFadeMs, loop: true });
    pushTimer(viewer, function () { finishIdle(viewer); }, (options.fadeMs || ANIM_DEFAULTS.returnFadeMs) + 80);
  }

  function scheduleCycleEnd(viewer, plan) {
    const ctl = getController(viewer);
    pushTimer(viewer, function () {
      const queued = ctl.queuedPlan;
      ctl.queuedPlan = null;
      if (queued) {
        startPlan(viewer, queued, { queued: true });
        return;
      }
      // If this is a one-shot state and no new plan arrived, return to idle after its configured segment.
      if (ctl.key === plan.key && !plan.loopWhileActive && plan.returnIdleOnExit) {
        returnToIdle(viewer, plan.returnTo, { fadeMs: ANIM_DEFAULTS.returnFadeMs });
      }
      // State loops remain active without restart until a different mood/action is requested.
    }, Math.max(250, plan.durationMs || 1000));
  }

  function startPlan(viewer, plan, opts) {
    if (!viewer || !plan || !plan.animation) return false;
    const options = opts || {};
    const ctl = getController(viewer);
    const t = nowMs();
    clearControllerTimers(viewer);
    ctl.serial += 1;
    ctl.state = plan.actionKey === 'idle_default' ? 'idle' : (plan.loopWhileActive ? 'stateLoop' : 'oneShot');
    ctl.priority = plan.priority || 0;
    ctl.key = plan.key;
    ctl.actionKey = plan.actionKey || '';
    ctl.animation = plan.animation;
    ctl.lockUntil = t + Math.max(250, plan.minHoldMs || ANIM_DEFAULTS.minHoldMs);
    ctl.cycleUntil = t + Math.max(250, plan.durationMs || 1000);
    ctl.lastPlan = plan;
    ctl.lastMood = plan.mood;
    if (options.manual) ctl.manualUntil = t + Math.max(1000, plan.durationMs || 1200);

    markRootState(viewer, options.manual ? 'manual' : ctl.state, (options.manual ? 'LAB ' : '') + plan.animation);
    setViewerAnimation(viewer, plan.animation, {
      restart: !options.noRestart,
      fadeMs: options.fadeMs || (plan.actionKey === 'idle_default' ? ANIM_DEFAULTS.idleFadeMs : ANIM_DEFAULTS.enterFadeMs),
      loop: !!plan.loopWhileActive
    });

    if (plan.actionKey !== 'idle_default') scheduleCycleEnd(viewer, plan);
    return true;
  }

  function queueOrStart(viewer, plan, reason) {
    const ctl = getController(viewer);
    const t = nowMs();
    if (!ctl || ctl.state === 'new') return startPlan(viewer, plan);

    // Safety rule: identical animation is never overwritten/restarted.
    if (ctl.animation === plan.animation || viewer.__sassiCurrentAnimation === plan.animation) {
      ctl.lastIgnored = 'same motion kept: ' + (reason || 'same animation');
      ctl.lastPlan = plan;
      // Safety rule: if two actions intentionally use the same motion, update logical metadata only.
      // Do NOT restart, do NOT flash, do NOT overwrite playback.
      ctl.priority = Math.max(ctl.priority || 0, plan.priority || 0);
      ctl.key = plan.key;
      ctl.actionKey = plan.actionKey;
      ctl.state = plan.actionKey === 'idle_default' ? 'idle' : (plan.loopWhileActive ? 'stateLoop' : 'oneShot');
      return false;
    }

    if (t < (ctl.manualUntil || 0)) {
      ctl.queuedPlan = plan;
      ctl.lastIgnored = 'queued: manual lock';
      markRootState(viewer, 'locked', 'queued');
      return false;
    }

    if (t < (ctl.cycleUntil || 0)) {
      // Safety rule: wait for the configured current motion segment before overwriting.
      ctl.queuedPlan = plan;
      ctl.lastIgnored = 'queued until current motion segment ends';
      markRootState(viewer, 'locked', 'queued');
      return false;
    }

    return startPlan(viewer, plan);
  }

  function applyMoodToViewer(viewer, mood, view) {
    if (!viewer) return;
    const id = viewer.getAttribute('data-character') || (viewer.closest('.meshy3d-root') && viewer.closest('.meshy3d-root').getAttribute('data-character')) || '';
    const cfg = getCfg(id);
    if (!cfg) return;
    const safeMood = cssMood(mood);
    const ctx = normalizedView(view);
    const root = viewer.closest('.meshy3d-root');
    if (root) setMoodClass(root, safeMood, ctx);
    viewer.dataset.mood = safeMood;
    viewer.dataset.view = ctx;

    const plan = getPlan(cfg, safeMood, ctx);
    const ctl = getController(viewer);
    ctl.lastMood = safeMood;

    if (!plan || !plan.animation) return;

    // Idle/neutral requests also respect current cycle: they do not snap over an active state.
    if (plan.actionKey === 'idle_default') {
      return queueOrStart(viewer, plan, 'idle request');
    }

    return queueOrStart(viewer, plan, 'mood request');
  }
  function updateCamera(viewer, view) {
    if (!viewer) return;
    const cfg = getCfg(viewer.getAttribute('data-character'));
    if (!cfg) return;
    const finalPose = resolveCameraPose(cfg, view);
    const pose = isRevealView(view) ? revealPoseFromFinalPose(finalPose, 'start') : finalPose;
    viewer.setAttribute('camera-orbit', pose.orbit);
    viewer.setAttribute('camera-target', pose.target);
    viewer.setAttribute('field-of-view', pose.fov);
    viewer.setAttribute('min-camera-orbit', 'auto auto ' + pose.minDist);
    viewer.setAttribute('max-camera-orbit', 'auto auto ' + pose.maxDist);
    viewer.dataset.cameraFitMode = pose.mode;
    viewer.dataset.cameraFitClass = finalPose.fit ? finalPose.fit.fitClass : 'legacy';
    viewer.dataset.cameraFitRadius = pose.orbit.split(/\s+/)[2] || '';
    viewer.dataset.cameraFitTarget = pose.target;
  }

  function updateLighting(viewer, view) {
    if (!viewer) return;
    const cfg = getCfg(viewer.getAttribute('data-character'));
    if (!cfg) return;
    const lc = lightingConfig(cfg, view);
    viewer.setAttribute('exposure', lc.exposure);
    viewer.setAttribute('shadow-intensity', lc.shadow);
    viewer.setAttribute('environment-image', lc.env);
    try { viewer.exposure = Number(lc.exposure); } catch (err) {}
    try { viewer.shadowIntensity = Number(lc.shadow); } catch (err) {}
  }


  function setViewerLighting(viewer, exposure, shadow) {
    if (!viewer) return;
    const e = Math.max(0, Math.min(1.35, Number(exposure)));
    const s = Math.max(0, Math.min(1, Number(shadow)));
    viewer.setAttribute('exposure', String(Math.round(e * 1000) / 1000));
    viewer.setAttribute('shadow-intensity', String(Math.round(s * 1000) / 1000));
    try { viewer.exposure = e; } catch (_) {}
    try { viewer.shadowIntensity = s; } catch (_) {}
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
  function easeInOut(t) {
    t = Math.max(0, Math.min(1, t));
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function interpolatePose(a, b, t) {
    const pa = splitOrbit(a.orbit);
    const pb = splitOrbit(b.orbit);
    const az = lerp(numberFromDegString(pa.azimuth, 320), numberFromDegString(pb.azimuth, 320), t);
    const el = lerp(numberFromDegString(pa.elevation, 75), numberFromDegString(pb.elevation, 75), t);
    const ra = numberFromMetersString(pa.radius, 9);
    const rb = numberFromMetersString(pb.radius, 9);
    const fova = numberFromDegString(a.fov, 31);
    const fovb = numberFromDegString(b.fov, 31);
    return {
      orbit: deg(az) + ' ' + deg(el) + ' ' + meters(lerp(ra, rb, t)),
      target: b.target || a.target,
      fov: deg(lerp(fova, fovb, t))
    };
  }

  function applyPose(viewer, pose, jump) {
    if (!viewer || !pose) return;
    viewer.setAttribute('camera-orbit', pose.orbit);
    viewer.setAttribute('camera-target', pose.target);
    viewer.setAttribute('field-of-view', pose.fov);
    if (jump && typeof viewer.jumpCameraToGoal === 'function') {
      try { viewer.jumpCameraToGoal(); } catch (_) {}
    }
  }


  function getRevealIntroPlan(cfg, view) {
    if (!cfg) return null;
    const spec = cfg.actions && cfg.actions.intro_reveal ? cfg.actions.intro_reveal : null;
    const animation = (spec && spec.animation) || cfg.idle;
    const idle = getIdle(cfg);
    const durationMs = Math.max(1500, computeSegmentMs(cfg, spec || { animation: animation, minMs: 700, maxMs: 1700, cutRatio: .72 }, 'intro_reveal'));
    return {
      mood: 'intro',
      actionKey: 'intro_reveal',
      animation: animation,
      mode: 'revealLoop',
      loop: true,
      loopWhileActive: true,
      returnIdleOnExit: false,
      returnTo: idle,
      durationMs: durationMs,
      fullMs: getDuration(cfg, animation, durationMs),
      priority: 120,
      minHoldMs: Math.min(900, durationMs),
      key: 'intro_reveal|' + animation + '|reveal-pre-roll',
      spec: spec || {}
    };
  }

  function startRevealIntroMotion(viewer, cfg) {
    if (!viewer || !cfg) return null;
    const plan = getRevealIntroPlan(cfg, 'intro');
    if (!plan || !plan.animation) return null;
    const ctl = getController(viewer);
    clearControllerTimers(viewer);
    ctl.serial += 1;

    // V37.8: reveal intro is a real one-shot, not a state-loop.
    // It starts under the black pre-roll, plays once, reaches its real end,
    // then returns smoothly to the configured idle/default motion.
    const introFullMs = Math.max(250, Number(plan.fullMs || plan.durationMs || 1600));
    const token = ctl.serial;

    ctl.state = 'introOneShot';
    ctl.priority = plan.priority;
    ctl.key = plan.key;
    ctl.actionKey = plan.actionKey;
    ctl.animation = plan.animation;
    ctl.lockUntil = nowMs() + Math.max(450, Math.min(introFullMs, 1400));
    ctl.cycleUntil = nowMs() + introFullMs;
    ctl.queuedPlan = null;
    ctl.lastPlan = plan;
    ctl.lastMood = 'intro';

    markRootState(viewer, 'oneShot', 'intro ' + plan.animation);
    setViewerAnimation(viewer, plan.animation, { restart: true, fadeMs: 0, loop: false });

    pushTimer(viewer, function () {
      const current = getController(viewer);
      if (!current || current.serial !== token) return;
      if (current.key !== plan.key || current.animation !== plan.animation) return;

      const queued = current.queuedPlan;
      current.queuedPlan = null;
      if (queued) {
        startPlan(viewer, queued, { queued: true });
        return;
      }

      // End of the real intro clip: do not restart it from the ground.
      // Return to the chosen idle/default with the same smooth return fade used by the rest of the runtime.
      returnToIdle(viewer, plan.returnTo, { fadeMs: ANIM_DEFAULTS.returnFadeMs });
    }, introFullMs + 40);

    return plan;
  }

  function beginRevealController(viewer, root, view) {
    if (!viewer || !root || !isRevealView(view)) return;
    const stage = root.closest && root.closest('.meshy-arena-stage');
    if (!stage || stage.__sassiRevealStarted) return;
    stage.__sassiRevealStarted = true;
    const cfg = getCfg(viewer.getAttribute('data-character'));
    if (!cfg) return;

    const finalPose = resolveCameraPose(cfg, 'cinema');
    const startPose = revealPoseFromFinalPose(finalPose, 'start');
    const silhouettePose = revealPoseFromFinalPose(finalPose, 'silhouette');
    const baseLight = lightingConfig(cfg, 'cinema');
    const finalExposure = Number(baseLight.finalExposure || baseLight.exposure || .68);
    const finalShadow = Number(baseLight.finalShadow || baseLight.shadow || .46);

    // V37.7: CSS/markup already starts fully black. JS only prepares and opens the gate.
    stage.classList.add('s3d-real-reveal', 's3d-reveal-boot', 's3d-reveal-preroll');
    stage.style.setProperty('--s3d-stage-bright', '0.08');
    stage.style.setProperty('--s3d-stage-sat', '0.32');
    stage.style.setProperty('--s3d-reveal-character-opacity', '0');
    stage.style.setProperty('--s3d-reveal-vfx', '0');
    stage.style.setProperty('--s3d-blackgate', '1');

    setViewerLighting(viewer, 0.035, 0.98);
    applyPose(viewer, startPose, true);
    startRevealIntroMotion(viewer, cfg);
    stage.classList.add('s3d-reveal-prepared');

    const clock = (performance && performance.now) ? performance : Date;
    const setupStarted = clock.now();
    const preRollMs = 560;
    const duration = 4300;

    function tick(ts) {
      const now = ts || clock.now();
      const elapsed = now - setupStarted;
      if (elapsed < preRollMs) {
        stage.style.setProperty('--s3d-blackgate', '1');
        stage.style.setProperty('--s3d-reveal-character-opacity', '0');
        setViewerLighting(viewer, 0.035, 0.98);
        applyPose(viewer, startPose, false);
        viewer.__sassiRevealRaf = window.requestAnimationFrame(tick);
        return;
      }

      const tRaw = Math.max(0, Math.min(1, (elapsed - preRollMs) / duration));
      const lightT = easeOutCubic(Math.max(0, (tRaw - .06) / .72));
      const poseT1 = easeInOut(Math.max(0, Math.min(1, tRaw / .36)));
      const poseT2 = easeInOut(Math.max(0, Math.min(1, (tRaw - .30) / .70)));

      let pose;
      if (tRaw < .36) pose = interpolatePose(startPose, silhouettePose, poseT1);
      else pose = interpolatePose(silhouettePose, finalPose, poseT2);

      applyPose(viewer, pose, false);
      setViewerLighting(
        viewer,
        lerp(0.035, finalExposure, lightT),
        lerp(0.98, finalShadow, lightT)
      );

      const gateT = easeInOut(Math.max(0, Math.min(1, (tRaw - .02) / .24)));
      const blackGate = 1 - gateT;
      const charOpacity = tRaw < .08 ? 0 : easeOutCubic(Math.max(0, Math.min(1, (tRaw - .08) / .36)));
      const stageBright = lerp(.08, 1, easeOutCubic(Math.max(0, (tRaw - .08) / .78)));
      const stageSat = lerp(.32, 1, easeOutCubic(Math.max(0, (tRaw - .10) / .74)));
      const vfx = tRaw < .10 ? 0 : Math.max(0, Math.sin(Math.min(1, (tRaw - .10) / .70) * Math.PI));

      stage.style.setProperty('--s3d-blackgate', String(Math.round(blackGate * 1000) / 1000));
      stage.style.setProperty('--s3d-stage-bright', String(Math.round(stageBright * 1000) / 1000));
      stage.style.setProperty('--s3d-stage-sat', String(Math.round(stageSat * 1000) / 1000));
      stage.style.setProperty('--s3d-reveal-character-opacity', String(Math.round(charOpacity * 1000) / 1000));
      stage.style.setProperty('--s3d-reveal-vfx', String(Math.round(vfx * 1000) / 1000));

      if (tRaw > .10) stage.classList.add('s3d-reveal-gate-opened');
      if (tRaw > .22) stage.classList.add('s3d-reveal-silhouette');
      if (tRaw > .52) stage.classList.add('s3d-reveal-lit');

      if (tRaw < 1) {
        viewer.__sassiRevealRaf = window.requestAnimationFrame(tick);
      } else {
        applyPose(viewer, finalPose, false);
        setViewerLighting(viewer, finalExposure, finalShadow);
        stage.style.setProperty('--s3d-blackgate', '0');
        stage.style.setProperty('--s3d-stage-bright', '1');
        stage.style.setProperty('--s3d-stage-sat', '1');
        stage.style.setProperty('--s3d-reveal-character-opacity', '1');
        stage.style.setProperty('--s3d-reveal-vfx', '0');
        stage.classList.remove('s3d-reveal-boot', 's3d-reveal-preroll');
        stage.classList.add('s3d-reveal-complete');
      }
    }

    if (viewer.__sassiRevealRaf) {
      try { window.cancelAnimationFrame(viewer.__sassiRevealRaf); } catch (_) {}
    }
    viewer.__sassiRevealRaf = window.requestAnimationFrame(tick);
  }

  function hydrateRoot(root, opponent, mood, view) {
    if (!root) return;
    const viewer = root.querySelector('model-viewer.meshy3d-viewer');
    if (!viewer) return;
    const rawView = String(view || root.getAttribute('data-raw-view') || viewer.getAttribute('data-raw-view') || 'portrait');
    const id = root.getAttribute('data-character') || viewer.getAttribute('data-character') || idOf(opponent);
    const visualProfileKey = id + '|' + rawView;
    if (viewer.dataset.sassiVisualProfileKey !== visualProfileKey) {
      updateCamera(viewer, rawView);
      updateLighting(viewer, rawView);
      viewer.dataset.sassiVisualProfileKey = visualProfileKey;
    }
    const cfg = getCfg(id);
    const reveal = isRevealView(rawView);

    const doApply = function () {
      if (reveal) {
        beginRevealController(viewer, root, rawView);
        return;
      }
      applyMoodToViewer(viewer, mood, rawView);
    };

    if (viewer.__sassiLoadedOnce) doApply();
    else {
      viewer.addEventListener('load', function () {
        viewer.__sassiLoadedOnce = true;
        doApply();
      }, { once: true });
      if (cfg) {
        const introSpec = cfg.actions && cfg.actions.intro_reveal ? cfg.actions.intro_reveal : null;
        viewer.setAttribute('animation-name', reveal ? ((introSpec && introSpec.animation) || cfg.idle) : cfg.idle);
      }
    }
  }

  function characterMarkup(opponent, mood, context) {
    injectStyle();
    ensureModelViewerModule();
    // V37.7: keep raw context ("intro"/"reveal") alive.
    // Normalizing here made the model-viewer start as generic "cinema",
    // so reveal camera/lighting/motion could only arrive after the first paint.
    const rawView = String(context || 'portrait');
    return markup(opponent, mood || 'neutral', rawView);
  }


  const ARENA_BACKDROP_FILES = Object.freeze({
    stream: 'stream-nina.svg',
    quarry: 'quarry-bruno.svg',
    ravine: 'ravine-mara.svg',
    forge: 'forge-teo.svg',
    'volcano-dance': 'volcano-lalla.svg',
    'moss-ruins': 'ruins-orbo.svg',
    'crystal-cave': 'crystal-zelda.svg',
    blackboard: 'blackboard-prof.svg',
    'old-camp': 'camp-imperio.svg'
  });

  const ARENA_FX_FILES = Object.freeze({
    stream: ['water-ripple.svg', 'spark-star.svg', 'fog-wisp.svg'],
    quarry: ['dust-mote.svg', 'dust-mote.svg', 'fog-wisp.svg'],
    ravine: ['fog-wisp.svg', 'fog-wisp.svg', 'spark-star.svg'],
    forge: ['ember.svg', 'ember.svg', 'heat-wave.svg'],
    'volcano-dance': ['lava-pop.svg', 'ember.svg', 'spark-star.svg'],
    'moss-ruins': ['fog-wisp.svg', 'spark-star.svg', 'dust-mote.svg'],
    'crystal-cave': ['spark-star.svg', 'crystal-glint.svg', 'spark-star.svg'],
    blackboard: ['chalk-dust.svg', 'chalk-dust.svg', 'spark-star.svg'],
    'old-camp': ['ember.svg', 'ember.svg', 'fog-wisp.svg']
  });

  function arenaAssetEnv(env) {
    const key = String(env || 'stream');
    return ARENA_BACKDROP_FILES[key] ? key : 'stream';
  }

  function arenaSvgBackdropMarkup(env) {
    const key = arenaAssetEnv(env);
    const file = ARENA_BACKDROP_FILES[key];
    return '<div class="arena-svg-backdrop" aria-hidden="true" style="--arena-svg:url(assets/arenas/' + text(file) + ');"></div>';
  }

  function arenaSpriteFxMarkup(env) {
    const key = arenaAssetEnv(env);
    const files = ARENA_FX_FILES[key] || ARENA_FX_FILES.stream;
    let out = '<div class="arena-sprite-fx fx-' + text(key) + '" aria-hidden="true">';
    for (let i = 0; i < files.length; i += 1) {
      out += '<i class="fx-sprite fx' + (i + 1) + '" style="--fx-img:url(assets/fx/' + text(files[i]) + ');"></i>';
    }
    out += '</div>';
    return out;
  }

  function arenaMarkup(opponent, mood, context) {
    injectStyle();
    ensureModelViewerModule();
    const cfg = getCfg(opponent);
    if (!cfg) return '';
    const safeMood = cssMood(mood || 'neutral');
    const rawContext = String(context || 'cinema');
    const ctx = normalizedView(rawContext);
    const reveal = isRevealView(rawContext);
    const id = idOf(opponent);
    const env = cfg.env || 'stream';
    return `
      <div class="meshy-arena-stage arena-svg-mode" data-character="${text(id)}" data-env="${text(env)}" data-context="${text(ctx)}" data-raw-context="${text(rawContext)}" data-reveal="${reveal ? 'true' : 'false'}">
        ${arenaSvgBackdropMarkup(env)}
        ${arenaSpriteFxMarkup(env)}
        <i class="meshy-sky-glow"></i>
        <i class="meshy-mountain-layer"></i>
        <i class="meshy-tree-layer"></i>
        <i class="meshy-env-backdrop"></i>
        <i class="meshy-env-detail"></i>
        <i class="meshy-env-air"></i>
        <i class="meshy-river-bg"></i>
        <i class="meshy-ground-floor"></i>
        <i class="meshy-spark s1"></i><i class="meshy-spark s2"></i><i class="meshy-spark s3"></i><i class="meshy-spark s4"></i>
        <div class="meshy-arena-character">${characterMarkup(opponent, safeMood, rawContext)}</div>
        <i class="meshy-foot-grass"></i>
        <i class="meshy-reveal-light v1"></i><i class="meshy-reveal-light v2"></i><i class="meshy-reveal-fog"></i><i class="meshy-black-gate"></i>
      </div>`;
  }

  window.hasCharacter3DPilot = function hasCharacter3DPilot(opponent) { return !!PILOT_IDS[idOf(opponent)]; };

  window.renderCharacter3DFace = function renderCharacter3DFace(opponent, mood, context) {
    if (!window.hasCharacter3DPilot(opponent)) {
      return typeof window.renderOpponentFaceSvg === 'function' ? window.renderOpponentFaceSvg(opponent, mood, context) : '';
    }
    return characterMarkup(opponent, mood, context || 'game');
  };

  window.updateCharacter3DFace = function updateCharacter3DFace(faceEl, opponent, mood, context) {
    if (!faceEl || !window.hasCharacter3DPilot(opponent)) return false;
    injectStyle();
    ensureModelViewerModule();
    const id = idOf(opponent);
    const view = normalizedView(context || 'game');
    let root = faceEl.querySelector('.meshy3d-root[data-character="' + id + '"]');
    if (!root) {
      faceEl.innerHTML = characterMarkup(opponent, mood, view);
      root = faceEl.querySelector('.meshy3d-root[data-character="' + id + '"]');
    }
    hydrateRoot(root, opponent, mood || 'neutral', view);
    return true;
  };

  window.renderCharacter3DBattle = function renderCharacter3DBattle(opponent, mood, context) {
    if (!window.hasCharacter3DPilot(opponent)) return '';
    return characterMarkup(opponent, mood || 'neutral', context || 'cinema');
  };

  window.renderCharacter3DArena = function renderCharacter3DArena(opponent, mood, context) {
    if (!window.hasCharacter3DPilot(opponent)) return '';
    return arenaMarkup(opponent, mood || 'neutral', context || 'cinema');
  };

  window.hydrateCharacter3DWithin = function hydrateCharacter3DWithin(container, opponent, mood, context) {
    const host = container && container.querySelectorAll ? container : document;
    const selector = opponent && window.hasCharacter3DPilot(opponent)
      ? '.meshy3d-root[data-character="' + idOf(opponent) + '"]'
      : '.meshy3d-root[data-character]';
    const roots = host.querySelectorAll(selector);
    let count = 0;
    roots.forEach(function (root) {
      const id = root.getAttribute('data-character');
      const rootMood = mood || root.getAttribute('data-mood') || 'neutral';
      const rootView = context || root.getAttribute('data-raw-view') || root.getAttribute('data-view') || root.getAttribute('data-context') || 'portrait';
      hydrateRoot(root, opponent || { id: id, name: (REGISTRY[id] && REGISTRY[id].name) || id }, rootMood, rootView);
      count += 1;
    });
    return count;
  };

  window.disposeCharacter3DWithin = function disposeCharacter3DWithin(container) {
    const host = container && container.querySelectorAll ? container : document;
    const viewers = Array.prototype.slice.call(host.querySelectorAll('model-viewer'));
    viewers.forEach(function (viewer) {
      clearControllerTimers(viewer);
      if (viewer.__sassiRevealRaf) {
        try { window.cancelAnimationFrame(viewer.__sassiRevealRaf); } catch (err) {}
        viewer.__sassiRevealRaf = null;
      }
      try { if (typeof viewer.pause === 'function') viewer.pause(); } catch (err) {}
      viewer.removeAttribute('autoplay');
      viewer.dataset.sassiRuntimeActive = 'false';
    });
    return viewers.length;
  };

  window.syncCharacter3DActivity = function syncCharacter3DActivity(activeScreenId) {
    const activeId = String(activeScreenId || (document.querySelector('.screen.active') && document.querySelector('.screen.active').id) || '');
    const cinema = document.getElementById('battle-cinema');
    const cinemaVisible = !!(cinema && cinema.classList.contains('visible') && cinema.getAttribute('aria-hidden') === 'false');
    const viewers = Array.prototype.slice.call(document.querySelectorAll('model-viewer'));
    let running = 0;
    let paused = 0;
    viewers.forEach(function (viewer) {
      const screen = viewer.closest && viewer.closest('.screen');
      const inCinema = !!(viewer.closest && viewer.closest('#battle-cinema'));
      const shouldRun = (inCinema && cinemaVisible) || (!cinemaVisible && !!screen && screen.id === activeId);
      viewer.dataset.sassiRuntimeActive = shouldRun ? 'true' : 'false';
      if (shouldRun) {
        viewer.setAttribute('autoplay', '');
        try { if (viewer.loaded && typeof viewer.play === 'function') viewer.play(); } catch (err) {}
        running += 1;
      } else {
        viewer.removeAttribute('autoplay');
        try { if (typeof viewer.pause === 'function') viewer.pause(); } catch (err) {}
        paused += 1;
      }
    });
    return { activeScreenId: activeId, cinemaVisible: cinemaVisible, running: running, paused: paused, total: viewers.length };
  };

  function registryIds() { return Object.keys(PILOT_IDS); }

  function selectedCharacterId() {
    const raw = String(window.__SASSI_3D_SELECTED_ID || '').trim();
    if (raw && getCfg(raw)) return raw;
    const visible = document.querySelector('.meshy3d-viewer[data-character]');
    if (visible) return visible.getAttribute('data-character');
    return registryIds()[0] || '';
  }

  function find3DViewers(characterId) {
    const id = characterId ? String(characterId).trim() : '';
    const selector = id ? '.meshy3d-viewer[data-character="' + id + '"]' : '.meshy3d-viewer[data-character]';
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function targetViewers(opts) {
    const options = opts || {};
    const id = options.character || options.id || window.__SASSI_3D_SELECTED_ID || '';
    let viewers = find3DViewers(id);
    if (!viewers.length && !id) viewers = find3DViewers(selectedCharacterId());
    if (!viewers.length && options.all) viewers = find3DViewers('');
    return viewers;
  }

  function makeManualPlan(viewer, animation, opts) {
    const options = opts || {};
    const cfg = getCfg(viewer && viewer.getAttribute('data-character'));
    const idle = options.returnTo || getIdle(cfg);
    const full = getDuration(cfg, animation, 1400);
    const requested = options.ms || options.durationMs || (options.full ? full : Math.min(full, ANIM_DEFAULTS.manualMaxMs));
    return {
      mood: 'manual',
      animation: animation,
      returnTo: idle,
      durationMs: Math.max(250, Math.min(ANIM_DEFAULTS.manualMaxMs, Number(requested) || full)),
      fullMs: full,
      priority: 999,
      minHoldMs: Math.min(2000, Math.max(500, full * .25)),
      key: 'manual|' + animation,
      loop: !!options.loop
    };
  }

  window.SASSI_3D_CHARACTERS = function SASSI_3D_CHARACTERS() {
    return registryIds().map(function (id) {
      const cfg = getCfg(id);
      return { id: id, name: cfg && cfg.name, idle: getIdle(cfg), animations: Object.keys((cfg && cfg.durations) || {}) };
    });
  };

  window.SASSI_3D_SELECT = function SASSI_3D_SELECT(id) {
    const safe = String(id || '').trim();
    if (!getCfg(safe)) return 'Personaggio non trovato: ' + safe + '. Usa SASSI_3D_CHARACTERS().';
    window.__SASSI_3D_SELECTED_ID = safe;
    return 'Personaggio Clip Lab selezionato: ' + safe + '. Usa SASSI_3D_ANIMS() e SASSI_3D_PLAY("nome_clip").';
  };

  window.SASSI_3D_ANIMS = function SASSI_3D_ANIMS(id) {
    const safe = String(id || window.__SASSI_3D_SELECTED_ID || selectedCharacterId() || '').trim();
    const cfg = getCfg(safe);
    if (!cfg) return { error: 'Personaggio non trovato', selected: safe, hint: 'Usa SASSI_3D_CHARACTERS().' };
    const viewers = find3DViewers(safe);
    return {
      id: safe,
      name: cfg.name,
      idle: getIdle(cfg),
      registryAnimations: Object.keys(cfg.durations || {}).map(function (name) { return { name: name, ms: cfg.durations[name] }; }),
      viewerAvailableAnimations: viewers[0] ? (viewers[0].availableAnimations || []) : [],
      visibleViewers: viewers.length
    };
  };

  window.SASSI_3D_PLAY = function SASSI_3D_PLAY(name, opts) {
    const animation = String(name || '').trim();
    if (!animation) return 'Uso: SASSI_3D_PLAY("Nome_Animazione", {returnIdle:true})';
    const options = opts || {};
    const viewers = targetViewers(options);
    if (!viewers.length) return 'Nessun model-viewer visibile per il personaggio selezionato. Apri/mostra il personaggio nel gioco e riprova.';
    viewers.forEach(function (viewer) {
      const plan = makeManualPlan(viewer, animation, options);
      if (options.returnIdle === false || options.loop) {
        clearControllerTimers(viewer);
        const ctl = getController(viewer);
        ctl.state = 'manual';
        ctl.manualUntil = nowMs() + 3600000;
        markRootState(viewer, 'manual', 'LAB ' + animation);
        setViewerAnimation(viewer, animation, { restart: options.restart !== false, fadeMs: options.fadeMs || ANIM_DEFAULTS.enterFadeMs });
      } else {
        startReaction(viewer, plan, { manual: true, fadeMs: options.fadeMs || ANIM_DEFAULTS.enterFadeMs, returnFadeMs: options.returnFadeMs || ANIM_DEFAULTS.returnFadeMs });
      }
    });
    return 'Clip Lab: ' + animation + ' su ' + viewers.length + ' viewer(s).';
  };

  window.SASSI_3D_TEST_RETURN = function SASSI_3D_TEST_RETURN(name, opts) {
    const options = Object.assign({}, opts || {}, { returnIdle: true });
    return window.SASSI_3D_PLAY(name, options);
  };

  window.SASSI_3D_IDLE = function SASSI_3D_IDLE(name, id) {
    const safeId = String(id || window.__SASSI_3D_SELECTED_ID || selectedCharacterId() || '').trim();
    const cfg = getCfg(safeId);
    const animation = String(name || '').trim();
    if (!cfg) return 'Personaggio non trovato. Usa SASSI_3D_SELECT("id").';
    if (!animation) return 'Uso: SASSI_3D_IDLE("Nome_Idle"). Idle attuale: ' + getIdle(cfg);
    cfg.__sassiDebugIdle = animation;
    find3DViewers(safeId).forEach(function (viewer) {
      clearControllerTimers(viewer);
      const ctl = getController(viewer);
      ctl.manualUntil = 0;
      ctl.state = 'idle';
      markRootState(viewer, 'idle', 'idle');
      setViewerAnimation(viewer, animation, { restart: false, fadeMs: ANIM_DEFAULTS.returnFadeMs });
    });
    return 'Idle temporaneo per ' + safeId + ': ' + animation + '. Non è salvato nel codice definitivo.';
  };

  window.SASSI_3D_STOP_LAB = function SASSI_3D_STOP_LAB(opts) {
    const viewers = targetViewers(opts || {});
    viewers.forEach(function (viewer) {
      const cfg = getCfg(viewer.getAttribute('data-character'));
      const ctl = getController(viewer);
      ctl.manualUntil = 0;
      ctl.queuedPlan = null;
      clearControllerTimers(viewer);
      returnToIdle(viewer, getIdle(cfg), { fadeMs: ANIM_DEFAULTS.returnFadeMs });
    });
    return 'Clip Lab fermato su ' + viewers.length + ' viewer(s).';
  };

  window.SASSI_3D_PLAN = function SASSI_3D_PLAN(id) {
    const safe = String(id || window.__SASSI_3D_SELECTED_ID || selectedCharacterId() || '').trim();
    const cfg = getCfg(safe);
    if (!cfg) return { error: 'Personaggio non trovato', selected: safe };
    const moods = ['neutral', 'watch', 'thinking', 'smug', 'happy', 'mad', 'angry', 'intro', 'reveal', 'win', 'lose'];
    const out = {};
    moods.forEach(function (mood) { out[mood] = getPlan(cfg, mood, 'portrait'); });
    return { id: safe, name: cfg.name, idle: getIdle(cfg), actions: cfg.actions, planByMood: out };
  };

  window.SASSI_3D_STATUS = function SASSI_3D_STATUS() {
    return Array.prototype.map.call(document.querySelectorAll('.meshy3d-viewer'), function (viewer, idx) {
      const id = viewer.getAttribute('data-character');
      const ctl = getController(viewer);
      const cfg = getCfg(id);
      return {
        idx: idx,
        id: id,
        name: cfg && cfg.name,
        selected: window.__SASSI_3D_SELECTED_ID || null,
        view: viewer.getAttribute('data-view'),
        mood: viewer.getAttribute('data-mood'),
        idle: getIdle(cfg),
        animationName: viewer.animationName || viewer.getAttribute('animation-name'),
        availableAnimations: viewer.availableAnimations || [],
        currentAnimation: viewer.__sassiCurrentAnimation || null,
        loaded: !!viewer.__sassiLoadedOnce,
        controller: {
          state: ctl.state,
          priority: ctl.priority,
          key: ctl.key,
          queued: ctl.queuedPlan ? ctl.queuedPlan.animation : null,
          lastMood: ctl.lastMood,
          lastIgnored: ctl.lastIgnored,
          manualLocked: nowMs() < (ctl.manualUntil || 0)
        }
      };
    });
  };

  window.SASSI_3D_PLAY_ANIM = function SASSI_3D_PLAY_ANIM(name) {
    return window.SASSI_3D_PLAY(name, { all: true, returnIdle: true });
  };

  window.SASSI_3D_ANIM_STATUS = window.SASSI_3D_STATUS;


  window.SASSI_3D_CAMERA_STATUS = function SASSI_3D_CAMERA_STATUS(opts) {
    const viewers = targetViewers(opts || { all: true });
    return viewers.map(function (viewer) {
      const id = viewer.getAttribute('data-character') || '';
      const cfg = getCfg(id);
      const root = viewer.closest('.meshy3d-root');
      const view = root ? normalizedView(root.getAttribute('data-view')) : normalizedView(viewer.getAttribute('data-view'));
      const pose = cfg ? resolveCameraPose(cfg, view) : null;
      return {
        id: id,
        name: cfg && cfg.name,
        view: view,
        fitClass: pose && pose.fit && pose.fit.fitClass,
        bbox: pose && pose.fit ? {
          width: pose.fit.width,
          height: pose.fit.height,
          depth: pose.fit.depth,
          ratio: pose.fit.widthHeightRatio
        } : null,
        autoOrbit: pose && pose.orbit,
        autoTarget: pose && pose.target,
        autoFov: pose && pose.fov,
        currentOrbit: viewer.getAttribute('camera-orbit'),
        currentTarget: viewer.getAttribute('camera-target'),
        currentFov: viewer.getAttribute('field-of-view'),
        minCameraOrbit: viewer.getAttribute('min-camera-orbit'),
        maxCameraOrbit: viewer.getAttribute('max-camera-orbit'),
        reveal: {
          rawView: viewer.getAttribute('data-raw-view'),
          blackGate: viewer.closest('.meshy-arena-stage') ? getComputedStyle(viewer.closest('.meshy-arena-stage')).getPropertyValue('--s3d-blackgate').trim() : '',
          prepared: !!(viewer.closest('.meshy-arena-stage') && viewer.closest('.meshy-arena-stage').classList.contains('s3d-reveal-prepared'))
        }
      };
    });
  };

  window.SASSI_3D_CAMERA_REFRESH = function SASSI_3D_CAMERA_REFRESH(opts) {
    const viewers = targetViewers(opts || { all: true });
    viewers.forEach(function (viewer) {
      const root = viewer.closest('.meshy3d-root');
      const view = root ? root.getAttribute('data-view') : viewer.getAttribute('data-view');
      updateCamera(viewer, view || 'portrait');
    });
    return 'Auto-camera refresh applicato a ' + viewers.length + ' viewer(s). Usa SASSI_3D_CAMERA_STATUS() per leggere i valori.';
  };

  window.SASSI_3D_CAMERA_RADIUS = function SASSI_3D_CAMERA_RADIUS(radius, opts) {
    const r = Number(radius);
    if (!Number.isFinite(r) || r <= 0) return 'Uso: SASSI_3D_CAMERA_RADIUS(5.2, {all:true})';
    const viewers = targetViewers(opts || { all: true });
    viewers.forEach(function (viewer) {
      const current = parseOrbitParts(viewer.getAttribute('camera-orbit') || '320deg 78deg 9m');
      viewer.setAttribute('camera-orbit', current.azimuth + ' ' + current.elevation + ' ' + meters(r));
      viewer.setAttribute('min-camera-orbit', 'auto auto 3.2m');
      viewer.setAttribute('max-camera-orbit', 'auto auto 18m');
      if (typeof viewer.jumpCameraToGoal === 'function') viewer.jumpCameraToGoal();
    });
    return 'Camera radius temporaneo ' + meters(r) + ' applicato a ' + viewers.length + ' viewer(s).';
  };

  window.SASSI_3D_DEBUG_ORBIT = function SASSI_3D_DEBUG_ORBIT(deg, opts) {
    const angle = Number.isFinite(Number(deg)) ? Number(deg) : 320;
    const viewers = targetViewers(opts || { all: true });
    viewers.forEach(function (viewer) {
      const root = viewer.closest('.meshy3d-root');
      const view = root ? normalizedView(root.getAttribute('data-view')) : 'portrait';
      const current = viewer.getAttribute('camera-orbit') || '320deg 78deg 9m';
      const parts = current.split(/\s+/);
      const elevation = parts[1] || (view === 'cinema' ? '75deg' : '78deg');
      const distance = parts[2] || (view === 'cinema' ? '11.4m' : '9m');
      viewer.setAttribute('camera-orbit', angle + 'deg ' + elevation + ' ' + distance);
      if (typeof viewer.jumpCameraToGoal === 'function') viewer.jumpCameraToGoal();
    });
    return 'SASSI_3D_DEBUG_ORBIT=' + angle + 'deg applied to ' + viewers.length + ' viewer(s).';
  };

  window.SASSI_3D_ORBIT = window.SASSI_3D_DEBUG_ORBIT;
  // Alias legacy per non rompere vecchi debug Nina.
  window.SASSI_NINA_DEBUG_ORBIT = window.SASSI_3D_DEBUG_ORBIT;
  window.SASSI_NINA_PLAY_ANIM = window.SASSI_3D_PLAY_ANIM;
  window.SASSI_NINA_ANIM_STATUS = window.SASSI_3D_ANIM_STATUS;

  window.SASSI_CHARACTER3D_RUNTIME_V37 = Object.freeze({
    version: 'V37_15K_LALLA_SOUL_MASTERPIECE',
    ids: Object.keys(PILOT_IDS),
    modelViewerSrc: MODEL_VIEWER_SRC,
    textureTarget: 1024,
    externalGlb: true,
    registry: REGISTRY,
    note: 'V37.15K: complete Lalla Lapillo soul/R&B rewrite over V37.15J; new mellowLead preset, soul chords, laid-back microtiming, A-B-A-C chorus with exact A repetition, blues pickup, call-response harmony and walking bass; all V37.15J UX/DSP/MeshOpt/gameplay preserved.'
  });
  window.SASSI_CHARACTER3D_RUNTIME_V36 = window.SASSI_CHARACTER3D_RUNTIME_V37;
  window.SASSI_CHARACTER3D_RUNTIME_V35 = window.SASSI_CHARACTER3D_RUNTIME_V37;
  window.SASSI_CHARACTER3D_RUNTIME_V34 = window.SASSI_CHARACTER3D_RUNTIME_V37;
})();
