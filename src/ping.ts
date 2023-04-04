import type { Plugin, PluginContext } from "chatties/src/lib/plugins/plugin-api"

let context: PluginContext
let sound: HTMLAudioElement
export const plugin: Plugin = {
	id: "chatties-plugin-ping",
	init(pContext) {
		context = pContext
		sound = new Audio(pContext.setting<string>("audio-link"))
	},
	message(message) {
		const text = message.message_text.toLowerCase()
		const login = context.user.login()
		if (
			login &&
			(context.setting<boolean>("match-username")
				? new RegExp(`\\b${login}\\b`).test(text)
				: new RegExp(`\\b@${login}\\b`).test(text))
		) {
			sound.play()
			return
		}
		const setting = context.setting<string>("regex")
		if (setting) {
			const regex = new RegExp(setting)
			if (regex.test(text)) {
				sound.play()
				return
			}
		}
	},
	settings: {
		regex: {
			name: "Regex",
			type: "string",
			default: "",
		},
		"match-username": {
			name: "Also match username without @",
			type: "boolean",
			default: true,
		},
		"audio-link": {
			name: "Sound link",
			type: "string",
			default:
				"https://cdn.discordapp.com/attachments/724548622259322932/1089948396405669999/dink.mp3",
			changed(value) {
				sound.src = value
			},
		},
	},
}
