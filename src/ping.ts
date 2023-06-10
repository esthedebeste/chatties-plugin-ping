import type { PrivMessage } from "chatties/types/message"
import type { Plugin, PluginContext } from "chatties/types/plugin-api"

let context: PluginContext
let sound: HTMLAudioElement

function matches(message: PrivMessage) {
	const text = message.message_text.toLowerCase()
	const login = context.user.login()
	if (
		login &&
		(context.setting<boolean>("match-username")
			? new RegExp(`\\b${login}\\b`).test(text)
			: new RegExp(`\\b@${login}\\b`).test(text))
	) {
		return true
	}
	const setting = context.setting<string>("regex")
	if (setting) {
		const regex = new RegExp(setting)
		if (regex.test(text)) {
			return true
		}
	}
	return false
}

export const plugin = {
	id: "chatties-plugin-ping",
	init(pContext) {
		context = pContext
		sound = new Audio(pContext.setting<string>("audio-link"))
	},
	message(message) {
		const text = message.message_text.toLowerCase()
		if (matches(message)) {
			sound.play()
			if (context.setting<boolean>("tts")) {
				const format = context.setting<string>("tts-format")
				const channel = message.channel.login
				const sender = message.sender.login
				const tts = format
					.replaceAll("{channel}", channel)
					.replaceAll("{sender}", sender)
					.replaceAll("{message}", text)
				const utterance = new SpeechSynthesisUtterance(tts)
				const voice = speechSynthesis.getVoices()[context.setting<number>("tts-voice")]
				if (voice) utterance.voice = voice
				speechSynthesis.speak(utterance)
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
		tts: {
			name: "Enable text-to-speech (reads out the location of pings)",
			type: "boolean",
			default: false,
		},
		"tts-format": {
			name: "TTS format to speak",
			type: "string",
			default: "Ping in {channel}. {sender} said: '{message}'",
		},
		"tts-voice": {
			name: "TTS Voice Index",
			type: "number",
			default: 0,
		},
	},
} satisfies Plugin

speechSynthesis.addEventListener("voiceschanged", () => {
	const voices = speechSynthesis.getVoices()
	console.info("[chatties-plugin-ping] TTS voices changed!", voices)
	plugin.settings["tts-voice"].name = `TTS Voice Index - ${voices
		.map(
			(voice, index) =>
				`${index} for ${voice.name}${voice.localService ? " (LOCAL)" : " (USES REMOTE SERVICE)"}`
		)
		.join(", ")}`
})
