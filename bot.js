import "dotenv/config";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
} from "discord.js";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim() || "";
const GUILD_ID = process.env.DISCORD_GUILD_ID?.trim() || "1386023301092081925";
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID?.trim() || "";
const AFFCODE = process.env.AFFCODE?.trim() || "juszko20";
const USFANS_EMOJI_ID = process.env.USFANS_EMOJI_ID?.trim() || "";
const KAKOBUY_EMOJI_ID = process.env.KAKOBUY_EMOJI_ID?.trim() || "";
const LITBUY_EMOJI_ID = process.env.LITBUY_EMOJI_ID?.trim() || "";
const RAWLINK_EMOJI_ID = process.env.RAWLINK_EMOJI_ID?.trim() || "";
const AGENT_META = {
  usfans: {
    label: "USFans",
    iconUrl: "https://www.usfans.com/favicon.ico",
    buttonEmoji: USFANS_EMOJI_ID ? { id: USFANS_EMOJI_ID, name: "usfans" } : "🟡",
  },
  kakobuy: {
    label: "Kakobuy",
    iconUrl: "https://www.kakobuy.com/favicon.ico",
    buttonEmoji: KAKOBUY_EMOJI_ID ? { id: KAKOBUY_EMOJI_ID, name: "kakobuy" } : "🟢",
  },
  litbuy: {
    label: "LitBuy",
    iconUrl: "https://litbuy.com/favicon.ico",
    buttonEmoji: LITBUY_EMOJI_ID ? { id: LITBUY_EMOJI_ID, name: "litbuy" } : "🔥",
  },
  rawlink: {
    label: "Raw Link",
    iconUrl: "https://www.google.com/s2/favicons?domain=taobao.com&sz=64",
    buttonEmoji: RAWLINK_EMOJI_ID ? { id: RAWLINK_EMOJI_ID, name: "rawlink" } : "🔗",
  },
};

if (!BOT_TOKEN) {
  throw new Error("Brak DISCORD_BOT_TOKEN w .env");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

function safeUrl(input) {
  return new URL(input.startsWith("http") ? input : `https://x.com/?${input}`);
}

function getEmbeddedUrl(input) {
  const urlParam = safeUrl(input.trim());
  const embedded =
    urlParam.searchParams.get("url") ||
    urlParam.searchParams.get("itemUrl") ||
    urlParam.searchParams.get("item_url") ||
    urlParam.searchParams.get("goodsUrl") ||
    urlParam.searchParams.get("productLink") ||
    urlParam.searchParams.get("originKeywordUrl") ||
    urlParam.searchParams.get("sourceUrl") ||
    urlParam.searchParams.get("link");

  return embedded ? decodeURIComponent(embedded) : null;
}

function extractRawLink(input) {
  let current = input.trim();

  for (let index = 0; index < 4; index += 1) {
    const embedded = getEmbeddedUrl(current);
    if (!embedded) break;
    current = embedded;
  }

  return current;
}

function buildCanonicalProductUrl(platform, id) {
  if (platform === "1688") return `https://detail.1688.com/offer/${id}.html`;
  if (platform === "weidian") return `https://weidian.com/item.html?itemID=${id}`;
  if (platform === "taobao") return `https://item.taobao.com/item.htm?id=${id}`;
  return id;
}

function buildUsfansProductUrl(parsed) {
  if (!parsed.id) {
    const enc = encodeURIComponent(parsed.rawUrl);
    return `https://www.usfans.com/item/details?url=${enc}`;
  }

  if (parsed.platform === "1688") {
    return `https://www.usfans.com/product/1/${parsed.id}`;
  }

  return `https://www.usfans.com/product/3/${parsed.id}`;
}

function buildLitbuyProductUrl(parsed) {
  if (!parsed.id) {
    const enc = encodeURIComponent(parsed.rawUrl);
    return `https://litbuy.com/item/details?url=${enc}`;
  }

  if (parsed.platform === "1688") {
    return `https://litbuy.com/products/details?channel=1688&id=${parsed.id}`;
  }

  return `https://litbuy.com/products/details?channel=2&spuNo=${parsed.id}`;
}

function parseSourceLink(rawUrl) {
  const embedded = getEmbeddedUrl(rawUrl);
  if (embedded) return parseSourceLink(embedded);

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace("www.", "");

    if (host.includes("1688.com")) {
      const match = url.pathname.match(/offer\/(\d+)/);
      if (match) return { id: match[1], platform: "1688", rawUrl: buildCanonicalProductUrl("1688", match[1]) };
    }

    if (host.includes("taobao.com") || host.includes("tmall.com") || host.includes("world.taobao.com")) {
      const id = url.searchParams.get("id");
      if (id) return { id, platform: "taobao", rawUrl: buildCanonicalProductUrl("taobao", id) };
      const match = url.pathname.match(/\/(\d+)\.html?/);
      if (match) return { id: match[1], platform: "taobao", rawUrl: buildCanonicalProductUrl("taobao", match[1]) };
    }

    if (host.includes("weidian.com")) {
      const id = url.searchParams.get("itemID") || url.searchParams.get("id");
      if (id) return { id, platform: "weidian", rawUrl: buildCanonicalProductUrl("weidian", id) };
    }

    if (host.includes("kakobuy.com")) {
      const id = url.searchParams.get("id");
      if (id && /^\d+$/.test(id)) return { id, platform: "taobao", rawUrl: buildCanonicalProductUrl("taobao", id) };
    }

    if (host.includes("litbuy.com")) {
      const match = url.pathname.match(/\/product\/(\d+)\/(\d+)/);
      if (match) {
        const platform = match[1] === "0" ? "1688" : match[1] === "2" ? "weidian" : "taobao";
        return { id: match[2], platform, rawUrl: buildCanonicalProductUrl(platform, match[2]) };
      }
    }

    if (host.includes("usfans.com") || host.includes("usfans.io")) {
      const match = url.pathname.match(/\/product\/(\d+)\/(\d+)/);
      if (match) {
        const platform = match[1] === "1" ? "1688" : "taobao";
        return { id: match[2], platform, rawUrl: buildCanonicalProductUrl(platform, match[2]) };
      }
    }

    return { id: null, platform: "unknown", rawUrl };
  } catch {
    return { id: null, platform: "unknown", rawUrl };
  }
}

function appendAffCode(urlValue) {
  try {
    const url = new URL(urlValue);
    url.searchParams.set("affcode", AFFCODE);
    return url.toString();
  } catch {
    return urlValue;
  }
}

function buildAgentUrl(agent, parsed) {
  const enc = encodeURIComponent(parsed.rawUrl);

  if (agent === "rawlink") return appendAffCode(parsed.rawUrl);
  if (agent === "kakobuy") return appendAffCode(`https://www.kakobuy.com/item/details?url=${enc}`);
  if (agent === "litbuy") return appendAffCode(buildLitbuyProductUrl(parsed));
  if (agent === "usfans") return appendAffCode(buildUsfansProductUrl(parsed));
  return parsed.rawUrl;
}

function convertAllLinks(input) {
  const rawUrl = extractRawLink(input);
  const parsed = parseSourceLink(rawUrl);

  return {
    rawlink: buildAgentUrl("rawlink", parsed),
    kakobuy: buildAgentUrl("kakobuy", parsed),
    litbuy: buildAgentUrl("litbuy", parsed),
    usfans: buildAgentUrl("usfans", parsed),
  };
}

function extractFirstUrl(content) {
  const match = content.match(/https?:\/\/[^\s<>()]+/i);
  return match ? match[0] : null;
}

client.once("clientReady", () => {
  console.log(`Bot zalogowany jako ${client.user?.tag}`);
  console.log(
    `Nasluch: guild=${GUILD_ID}, channel=${CHANNEL_ID || "ALL_CHANNELS"}`
  );
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== GUILD_ID) return;
  if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) return;

  const originalUrl = extractFirstUrl(message.content);
  if (!originalUrl) return;

  try {
    const converted = convertAllLinks(originalUrl);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("Twoje przekonwertowane linki!")
      .setDescription("Kliknij przycisk ponizej, zeby otworzyc wybrany link.")
      .addFields({
        name: "Oryginalny link",
        value: originalUrl.length > 1024 ? `${originalUrl.slice(0, 1000)}...` : originalUrl,
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("USFans")
        .setEmoji(AGENT_META.usfans.buttonEmoji)
        .setStyle(ButtonStyle.Link)
        .setURL(converted.usfans),
      new ButtonBuilder()
        .setLabel("Kakobuy")
        .setEmoji(AGENT_META.kakobuy.buttonEmoji)
        .setStyle(ButtonStyle.Link)
        .setURL(converted.kakobuy),
      new ButtonBuilder()
        .setLabel("LitBuy")
        .setEmoji(AGENT_META.litbuy.buttonEmoji)
        .setStyle(ButtonStyle.Link)
        .setURL(converted.litbuy),
      new ButtonBuilder()
        .setLabel("Raw Link")
        .setEmoji(AGENT_META.rawlink.buttonEmoji)
        .setStyle(ButtonStyle.Link)
        .setURL(converted.rawlink),
    );

    await message.reply({
      embeds: [embed],
      components: [row],
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    console.error("Blad konwersji:", error);
  }
});

client.login(BOT_TOKEN).catch((error) => {
  console.error("Nie udalo sie zalogowac bota:", error);

  if (String(error?.message || error).includes("disallowed intents")) {
    console.error(
      "Wlacz Message Content Intent w Discord Developer Portal: Applications > Your Bot > Bot > Privileged Gateway Intents."
    );
  }
});
