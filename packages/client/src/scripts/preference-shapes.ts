// Generated from the actual preference store types. Do not edit by hand.
import type { RuntimeShape } from './runtime-shape';
export const preferenceShapes: RuntimeShape[] = [
	{
		"kind": "array",
		"item": 1
	},
	{
		"kind": "string"
	},
	{
		"kind": "union",
		"members": [
			3,
			4,
			5,
			6
		]
	},
	{
		"kind": "literal",
		"value": "public"
	},
	{
		"kind": "literal",
		"value": "home"
	},
	{
		"kind": "literal",
		"value": "followers"
	},
	{
		"kind": "literal",
		"value": "specified"
	},
	{
		"kind": "boolean"
	},
	{
		"kind": "array",
		"item": 9
	},
	{
		"kind": "object",
		"properties": {
			"id": {
				"optional": false,
				"schema": 1
			},
			"name": {
				"optional": true,
				"schema": 10
			},
			"type": {
				"optional": false,
				"schema": 12
			},
			"size": {
				"optional": false,
				"schema": 17
			},
			"black": {
				"optional": false,
				"schema": 7
			},
			"props": {
				"optional": false,
				"schema": 23
			}
		}
	},
	{
		"kind": "union",
		"members": [
			11,
			1
		]
	},
	{
		"kind": "undefined"
	},
	{
		"kind": "union",
		"members": [
			13,
			14,
			15,
			16
		]
	},
	{
		"kind": "null"
	},
	{
		"kind": "literal",
		"value": "rss"
	},
	{
		"kind": "literal",
		"value": "federation"
	},
	{
		"kind": "literal",
		"value": "userList"
	},
	{
		"kind": "union",
		"members": [
			18,
			19,
			20,
			21,
			22
		]
	},
	{
		"kind": "literal",
		"value": "verySmall"
	},
	{
		"kind": "literal",
		"value": "small"
	},
	{
		"kind": "literal",
		"value": "medium"
	},
	{
		"kind": "literal",
		"value": "large"
	},
	{
		"kind": "literal",
		"value": "veryLarge"
	},
	{
		"kind": "object",
		"properties": {
			"url": {
				"optional": true,
				"schema": 10
			},
			"userListId": {
				"optional": true,
				"schema": 10
			},
			"shuffle": {
				"optional": true,
				"schema": 24
			},
			"colored": {
				"optional": true,
				"schema": 24
			},
			"display": {
				"optional": true,
				"schema": 27
			},
			"marqueeDuration": {
				"optional": true,
				"schema": 30
			},
			"marqueeReverse": {
				"optional": true,
				"schema": 24
			},
			"oneByOneInterval": {
				"optional": true,
				"schema": 30
			},
			"refreshIntervalSec": {
				"optional": true,
				"schema": 30
			}
		}
	},
	{
		"kind": "union",
		"members": [
			11,
			25,
			26
		]
	},
	{
		"kind": "literal",
		"value": false
	},
	{
		"kind": "literal",
		"value": true
	},
	{
		"kind": "union",
		"members": [
			11,
			28,
			29
		]
	},
	{
		"kind": "literal",
		"value": "marquee"
	},
	{
		"kind": "literal",
		"value": "oneByOne"
	},
	{
		"kind": "union",
		"members": [
			11,
			31
		]
	},
	{
		"kind": "number"
	},
	{
		"kind": "array",
		"item": 33
	},
	{
		"kind": "object",
		"properties": {
			"name": {
				"optional": false,
				"schema": 1
			},
			"id": {
				"optional": false,
				"schema": 1
			},
			"place": {
				"optional": true,
				"schema": 34
			},
			"data": {
				"optional": false,
				"schema": 35
			}
		}
	},
	{
		"kind": "union",
		"members": [
			11,
			13,
			1
		]
	},
	{
		"kind": "object",
		"properties": {},
		"index": 36
	},
	{
		"kind": "unknown"
	},
	{
		"kind": "object",
		"properties": {
			"src": {
				"optional": false,
				"schema": 38
			},
			"arg": {
				"optional": false,
				"schema": 13
			}
		}
	},
	{
		"kind": "union",
		"members": [
			4,
			39,
			40,
			41
		]
	},
	{
		"kind": "literal",
		"value": "local"
	},
	{
		"kind": "literal",
		"value": "social"
	},
	{
		"kind": "literal",
		"value": "global"
	},
	{
		"kind": "union",
		"members": [
			13,
			43,
			44,
			45
		]
	},
	{
		"kind": "literal",
		"value": "smartphone"
	},
	{
		"kind": "literal",
		"value": "tablet"
	},
	{
		"kind": "literal",
		"value": "desktop"
	},
	{
		"kind": "union",
		"members": [
			47,
			48,
			49
		]
	},
	{
		"kind": "literal",
		"value": "quiet"
	},
	{
		"kind": "literal",
		"value": "reload"
	},
	{
		"kind": "literal",
		"value": "dialog"
	},
	{
		"kind": "union",
		"members": [
			51,
			52,
			53
		]
	},
	{
		"kind": "literal",
		"value": "respect"
	},
	{
		"kind": "literal",
		"value": "force"
	},
	{
		"kind": "literal",
		"value": "ignore"
	},
	{
		"kind": "union",
		"members": [
			55,
			56,
			57
		]
	},
	{
		"kind": "literal",
		"value": "remote"
	},
	{
		"kind": "literal",
		"value": "none"
	},
	{
		"kind": "literal",
		"value": "always"
	},
	{
		"kind": "union",
		"members": [
			59,
			60,
			61
		]
	},
	{
		"kind": "literal",
		"value": "sideFull"
	},
	{
		"kind": "literal",
		"value": "sideIcon"
	},
	{
		"kind": "literal",
		"value": "top"
	},
	{
		"kind": "object",
		"properties": {
			"id": {
				"optional": false,
				"schema": 1
			},
			"name": {
				"optional": false,
				"schema": 1
			},
			"author": {
				"optional": false,
				"schema": 1
			},
			"desc": {
				"optional": true,
				"schema": 10
			},
			"kind": {
				"optional": true,
				"schema": 63
			},
			"base": {
				"optional": true,
				"schema": 63
			},
			"props": {
				"optional": false,
				"schema": 66
			}
		}
	},
	{
		"kind": "union",
		"members": [
			11,
			64,
			65
		]
	},
	{
		"kind": "literal",
		"value": "light"
	},
	{
		"kind": "literal",
		"value": "dark"
	},
	{
		"kind": "object",
		"properties": {},
		"index": 1
	},
	{
		"kind": "array",
		"item": 68
	},
	{
		"kind": "object",
		"properties": {
			"version": {
				"optional": false,
				"schema": 1
			},
			"author": {
				"optional": false,
				"schema": 1
			},
			"description": {
				"optional": true,
				"schema": 10
			},
			"permissions": {
				"optional": true,
				"schema": 69
			},
			"config": {
				"optional": true,
				"schema": 70
			},
			"id": {
				"optional": false,
				"schema": 1
			},
			"name": {
				"optional": false,
				"schema": 1
			},
			"active": {
				"optional": false,
				"schema": 7
			},
			"configData": {
				"optional": false,
				"schema": 35
			},
			"token": {
				"optional": false,
				"schema": 116
			},
			"ast": {
				"optional": false,
				"schema": 117
			}
		}
	},
	{
		"kind": "union",
		"members": [
			11,
			0
		]
	},
	{
		"kind": "union",
		"members": [
			11,
			71
		]
	},
	{
		"kind": "object",
		"properties": {},
		"index": 72
	},
	{
		"kind": "union",
		"members": [
			73,
			77,
			81,
			85,
			90,
			93,
			98,
			103,
			109
		]
	},
	{
		"kind": "intersection",
		"members": [
			74,
			75
		]
	},
	{
		"kind": "object",
		"properties": {
			"label": {
				"optional": true,
				"schema": 10
			},
			"description": {
				"optional": true,
				"schema": 10
			},
			"required": {
				"optional": true,
				"schema": 24
			},
			"hidden": {
				"optional": true,
				"schema": 24
			}
		}
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 76
			},
			"default": {
				"optional": true,
				"schema": 34
			},
			"multiline": {
				"optional": true,
				"schema": 24
			}
		}
	},
	{
		"kind": "literal",
		"value": "string"
	},
	{
		"kind": "intersection",
		"members": [
			74,
			78
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 79
			},
			"default": {
				"optional": true,
				"schema": 80
			},
			"step": {
				"optional": true,
				"schema": 30
			}
		}
	},
	{
		"kind": "literal",
		"value": "number"
	},
	{
		"kind": "union",
		"members": [
			11,
			13,
			31
		]
	},
	{
		"kind": "intersection",
		"members": [
			74,
			82
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 83
			},
			"default": {
				"optional": true,
				"schema": 84
			}
		}
	},
	{
		"kind": "literal",
		"value": "boolean"
	},
	{
		"kind": "union",
		"members": [
			11,
			13,
			25,
			26
		]
	},
	{
		"kind": "intersection",
		"members": [
			74,
			86
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 87
			},
			"default": {
				"optional": false,
				"schema": 36
			},
			"enum": {
				"optional": false,
				"schema": 88
			}
		}
	},
	{
		"kind": "literal",
		"value": "enum"
	},
	{
		"kind": "array",
		"item": 89
	},
	{
		"kind": "object",
		"properties": {
			"label": {
				"optional": false,
				"schema": 1
			},
			"value": {
				"optional": false,
				"schema": 36
			}
		}
	},
	{
		"kind": "intersection",
		"members": [
			74,
			91
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 92
			},
			"default": {
				"optional": false,
				"schema": 36
			},
			"options": {
				"optional": false,
				"schema": 88
			}
		}
	},
	{
		"kind": "literal",
		"value": "radio"
	},
	{
		"kind": "intersection",
		"members": [
			74,
			94
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 95
			},
			"default": {
				"optional": false,
				"schema": 31
			},
			"min": {
				"optional": false,
				"schema": 31
			},
			"max": {
				"optional": false,
				"schema": 31
			},
			"step": {
				"optional": true,
				"schema": 30
			},
			"textConverter": {
				"optional": true,
				"schema": 96
			}
		}
	},
	{
		"kind": "literal",
		"value": "range"
	},
	{
		"kind": "union",
		"members": [
			11,
			97
		]
	},
	{
		"kind": "function"
	},
	{
		"kind": "intersection",
		"members": [
			74,
			99
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 100
			},
			"default": {
				"optional": true,
				"schema": 101
			},
			"content": {
				"optional": true,
				"schema": 10
			},
			"action": {
				"optional": false,
				"schema": 102
			}
		}
	},
	{
		"kind": "literal",
		"value": "button"
	},
	{
		"kind": "union",
		"members": [
			11,
			13
		]
	},
	{
		"kind": "function"
	},
	{
		"kind": "intersection",
		"members": [
			74,
			104
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 105
			},
			"default": {
				"optional": false,
				"schema": 106
			},
			"hidden": {
				"optional": false,
				"schema": 26
			},
			"validate": {
				"optional": true,
				"schema": 107
			}
		}
	},
	{
		"kind": "literal",
		"value": "object"
	},
	{
		"kind": "union",
		"members": [
			13,
			35
		]
	},
	{
		"kind": "union",
		"members": [
			11,
			108
		]
	},
	{
		"kind": "function"
	},
	{
		"kind": "intersection",
		"members": [
			74,
			110
		]
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 111
			},
			"default": {
				"optional": false,
				"schema": 112
			},
			"hidden": {
				"optional": false,
				"schema": 26
			},
			"validate": {
				"optional": true,
				"schema": 114
			}
		}
	},
	{
		"kind": "literal",
		"value": "array"
	},
	{
		"kind": "union",
		"members": [
			13,
			113
		]
	},
	{
		"kind": "array",
		"item": 36
	},
	{
		"kind": "union",
		"members": [
			11,
			115
		]
	},
	{
		"kind": "function"
	},
	{
		"kind": "union",
		"members": [
			13,
			1
		]
	},
	{
		"kind": "array",
		"item": 118
	},
	{
		"kind": "array",
		"item": 119
	},
	{
		"kind": "unknown"
	},
	{
		"kind": "object",
		"properties": {
			"type": {
				"optional": false,
				"schema": 116
			},
			"volume": {
				"optional": false,
				"schema": 31
			}
		}
	}
];
export const pluginShape = 68;
export const hotPreferenceShapes = {
	"menu": 0,
	"visibility": 2,
	"localOnly": 7,
	"statusbars": 8,
	"widgets": 32,
	"tl": 37,
	"overridedDeviceKind": 42,
	"serverDisconnectedBehavior": 46,
	"nsfw": 50,
	"animation": 7,
	"animatedMfm": 7,
	"loadRawImages": 7,
	"imageNewTab": 7,
	"disableShowingAnimatedImages": 7,
	"disablePagesScript": 7,
	"useOsNativeEmojis": 7,
	"disableDrawer": 7,
	"useBlurEffectForModal": 7,
	"useBlurEffect": 7,
	"showFixedPostForm": 7,
	"enableInfiniteScroll": 7,
	"useReactionPickerForContextMenu": 7,
	"showGapBetweenNotesInTimeline": 7,
	"instanceTicker": 54,
	"reactionPickerSize": 31,
	"reactionPickerWidth": 31,
	"reactionPickerHeight": 31,
	"reactionPickerUseDrawerForMobile": 7,
	"defaultSideView": 7,
	"menuDisplay": 58,
	"reportError": 7,
	"squareAvatars": 7,
	"numberOfPageCache": 31,
	"aiChanMode": 7
} as const;
export const coldPreferenceShapes = {
	"lightTheme": 62,
	"darkTheme": 62,
	"syncDeviceDarkMode": 7,
	"plugins": 67,
	"mediaVolume": 31,
	"sound_masterVolume": 31,
	"sound_note": 120,
	"sound_noteMy": 120,
	"sound_notification": 120,
	"sound_chat": 120,
	"sound_chatBg": 120,
	"sound_antenna": 120,
	"sound_channel": 120
} as const;
