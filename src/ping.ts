import type { PrivMessage } from "chatties/types/message"
import type { Plugin, PluginContext } from "chatties/types/plugin-api"

let context: PluginContext
let sound: HTMLAudioElement

function matches(message: PrivMessage): "match" | "channel-ping" | false {
	if (Date.now() - message.timestamp.getTime() > 1000 * 30) return false // Only ping for messages that are less than 30 seconds old
	const text = message.message_text.toLowerCase()
	const login = context.user.login()
	if (
		login &&
		(context.setting<boolean>("match-username")
			? new RegExp(`\\b${login}\\b`).test(text)
			: new RegExp(`\\b@${login}\\b`).test(text))
	)
		return "match"

	const alwaysPingChannels = new Set(
		context
			.setting<string>("ping-channels")
			.split(",")
			.map(s => s.trim())
	)

	const onlyViewing = context.setting<boolean>("ping-channels-only-viewing")
	if (
		(!onlyViewing || message.channel.login === context.visual.currentChannel()) &&
		(alwaysPingChannels.has("*") || alwaysPingChannels.has(message.channel.login))
	)
		return "channel-ping"

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
		const match = matches(message)
		if (match) {
			sound.play()
			if (context.setting<boolean>("tts")) {
				const format = context.setting<string>(
					match === "match"
						? "tts-format"
						: /* match === "channel-ping" ? */
						  "tts-format-channel-ping"
				)
				const channel = message.channel.login
				const sender = message.sender.login
				const tts = format
					.replaceAll("{channel}", channel)
					.replaceAll("{sender}", sender)
					.replaceAll("{message}", text)
				const utterance = new SpeechSynthesisUtterance(tts)
				const voiceSetting = context.setting<string>("tts-voice")
				if (voiceSetting) {
					const index = Number.parseInt(voiceSetting)
					const voice = speechSynthesis.getVoices()[index]
					utterance.voice = voice
				}
				utterance.rate = context.setting<number>("tts-speed")
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
		"ping-channels": {
			name: "Comma-seperated list of channels to trigger a ping for. `*` means any channel",
			type: "string",
			default: "",
		},
		"ping-channels-only-viewing": {
			name: "Only do channel-ping if you are currently looking at that channel",
			type: "boolean",
			default: true,
		},
		tts: {
			name: "Enable text-to-speech (reads out the location of pings)",
			type: "boolean",
			default: false,
		},
		"tts-speed": {
			name: "Rate at which the TTS talks.",
			type: "number",
			default: 1,
		},
		"tts-format": {
			name: "TTS format to speak",
			type: "string",
			default: "Ping in {channel}. {sender} said: '{message}'",
		},
		"tts-format-channel-ping": {
			name: "TTS format to speak when sourced from a channel ping.",
			type: "string",
			default: "Ping in {channel}. {sender} said: '{message}'",
		},
		"tts-voice": {
			name: "TTS Voice",
			type: "string-enum",
			options: [] as string[],
			default: "",
		},
	},
} satisfies Plugin

speechSynthesis.addEventListener("voiceschanged", () => {
	const voices = speechSynthesis.getVoices()
	console.info("[chatties-plugin-ping] TTS voices changed!", voices)
	plugin.settings["tts-voice"].options = voices.map(
		(voice, index) =>
			`${index} - ${voice.name}${voice.localService ? " (LOCAL)" : " (USES REMOTE SERVICE)"}`
	)
})
