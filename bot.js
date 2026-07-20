import "dotenv/config";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim() || "";
const GUILD_ID = process.env.DISCORD_GUILD_ID?.trim() || "1386023301092081925";
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID?.trim() || "";
// Reward redemption: the site owns the orders, this bot is the counter people walk up to.
const SITE_URL = (process.env.SITE_URL?.trim() || "https://juszkoreps-czjp.onrender.com").replace(/\/+$/, "");
const SITE_API_KEY = process.env.INTERNAL_API_KEY?.trim() || "";
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID?.trim() || process.env.DISCORD_ADMIN_ROLE_ID?.trim() || "";
const AFFCODE = process.env.AFFCODE?.trim() || "juszko20";
const USFANS_EMOJI_ID = process.env.USFANS_EMOJI_ID?.trim() || "";
const KAKOBUY_EMOJI_ID = process.env.KAKOBUY_EMOJI_ID?.trim() || "";
const LITBUY_EMOJI_ID = process.env.LITBUY_EMOJI_ID?.trim() || "";
const RAWLINK_EMOJI_ID = process.env.RAWLINK_EMOJI_ID?.trim() || "";
const AGENT_META = {
  usfans: {
    label: "USFans",
    iconUrl: "https://www.usfans.com/favicon.ico",
    buttonEmoji: USFANS_EMOJI_ID ? { id: USFANS_EMOJI_ID, name: "usfans" } : null,
  },
  kakobuy: {
    label: "Kakobuy",
    iconUrl: "https://www.kakobuy.com/favicon.ico",
    buttonEmoji: KAKOBUY_EMOJI_ID ? { id: KAKOBUY_EMOJI_ID, name: "kakobuy" } : null,
  },
  litbuy: {
    label: "LitBuy",
    iconUrl: "https://litbuy.com/favicon.ico",
    buttonEmoji: LITBUY_EMOJI_ID ? { id: LITBUY_EMOJI_ID, name: "litbuy" } : null,
  },
  rawlink: {
    label: "Raw Link",
    iconUrl: "https://www.google.com/s2/favicons?domain=taobao.com&sz=64",
    buttonEmoji: RAWLINK_EMOJI_ID ? { id: RAWLINK_EMOJI_ID, name: "rawlink" } : null,
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

function isResolvableShortAgentLink(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace("www.", "");
    return host === "ikako.vip" || host === "sl.kakobuy.com";
  } catch {
    return false;
  }
}

async function resolveShortAgentLink(rawUrl) {
  if (!isResolvableShortAgentLink(rawUrl)) {
    return rawUrl;
  }

  try {
    const response = await fetch(rawUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; JuszkoConverterBot/1.0)",
      },
    });

    return response.url || rawUrl;
  } catch (error) {
    console.error("Nie udalo sie rozwinac shortlinku agenta:", rawUrl, error);
    return rawUrl;
  }
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

async function convertAllLinks(input) {
  const extractedUrl = extractRawLink(input);
  const rawUrl = extractRawLink(await resolveShortAgentLink(extractedUrl));
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

function createAgentButton(label, url, emoji) {
  const button = new ButtonBuilder()
    .setLabel(label)
    .setStyle(ButtonStyle.Link)
    .setURL(url);

  if (emoji) {
    button.setEmoji(emoji);
  }

  return button;
}

const rewardCommands = [
  new SlashCommandBuilder()
    .setName("nagroda")
    .setDescription("Odbierz nagrode kupiona za Juszko Coins")
    .addStringOption((option) =>
      option.setName("kod").setDescription("Kod odbioru ze strony, np. JR-A7K9-M2P4").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("nagrodazrealizowana")
    .setDescription("Oznacz nagrode jako wydana (tylko obsluga)")
    .addStringOption((option) => option.setName("kod").setDescription("Kod odbioru").setRequired(true))
    .addStringOption((option) => option.setName("notatka").setDescription("Np. wydany kod vouchera").setRequired(false)),
  new SlashCommandBuilder()
    .setName("nagrodaanuluj")
    .setDescription("Anuluj zamowienie i zwroc coiny (tylko obsluga)")
    .addStringOption((option) => option.setName("kod").setDescription("Kod odbioru").setRequired(true)),
].map((command) => command.toJSON());

async function registerRewardCommands() {
  if (!SITE_API_KEY) {
    console.warn("[nagrody] Brak INTERNAL_API_KEY w .env - komendy nagrod NIE zostaly zarejestrowane.");
    return;
  }

  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    // Guild-scoped: appears instantly instead of the ~1h global propagation.
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: rewardCommands });
    console.log("[nagrody] Komendy zarejestrowane: /nagroda, /nagrodazrealizowana, /nagrodaanuluj");
  } catch (error) {
    console.error("[nagrody] Nie udalo sie zarejestrowac komend:", error);
  }
}

async function callSite(path, payload) {
  const response = await fetch(`${SITE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": SITE_API_KEY },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  return { ok: response.ok && data?.ok === true, status: response.status, data };
}

function isStaff(interaction) {
  if (!STAFF_ROLE_ID) {
    // Without a configured role, fall back to Discord's own permission model rather
    // than letting everybody mark rewards as delivered.
    return Boolean(interaction.memberPermissions?.has("ManageGuild"));
  }
  return Boolean(interaction.member?.roles?.cache?.has(STAFF_ROLE_ID));
}

function orderEmbed(order, { title, color, footer }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields(
      { name: "Nagroda", value: String(order.rewardTitle || "-"), inline: false },
      { name: "Kod", value: `\`${order.code}\``, inline: true },
      { name: "Zaplacono", value: `${order.rewardCost} JC`, inline: true },
      { name: "Kupujacy", value: order.discordUserId ? `<@${order.discordUserId}>` : "-", inline: true },
    );
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

async function handleNagroda(interaction) {
  const code = interaction.options.getString("kod", true).trim();
  await interaction.deferReply();

  const result = await callSite("/api/affiliate/rewards/claim", {
    code,
    discordUserId: interaction.user.id,
  });

  if (!result.ok) {
    const message = result.data?.message || "Nie udalo sie sprawdzic kodu.";
    await interaction.editReply(`❌ ${message}`);
    return;
  }

  const order = result.data.order;
  await interaction.editReply({
    content: STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}> nowa nagroda do wydania` : undefined,
    embeds: [
      orderEmbed(order, {
        title: "🟡 Nagroda do wydania",
        color: 0xf5c518,
        footer: "Obsluga: po wydaniu wpisz /nagrodazrealizowana z tym kodem",
      }),
    ],
  });
}

async function handleNagrodaZrealizowana(interaction) {
  if (!isStaff(interaction)) {
    await interaction.reply({ content: "❌ Ta komenda jest tylko dla obslugi.", ephemeral: true });
    return;
  }

  const code = interaction.options.getString("kod", true).trim();
  const note = interaction.options.getString("notatka")?.trim() || null;
  await interaction.deferReply();

  const result = await callSite("/api/affiliate/rewards/complete", {
    code,
    action: "deliver",
    deliveredBy: interaction.user.tag,
    note,
  });

  if (!result.ok) {
    await interaction.editReply(`❌ ${result.data?.message || "Nie udalo sie oznaczyc jako wydane."}`);
    return;
  }

  const order = result.data.order;
  await interaction.editReply({
    embeds: [
      orderEmbed(order, {
        title: "✅ Nagroda wydana",
        color: 0x22c55e,
        footer: `Wydal: ${interaction.user.tag}`,
      }),
    ],
  });

  // Best effort - plenty of people have DMs closed, and that must not fail the command.
  try {
    const user = await client.users.fetch(order.discordUserId);
    await user.send(
      `✅ Twoja nagroda **${order.rewardTitle}** (kod \`${order.code}\`) zostala wydana.` +
        (note ? `\n${note}` : ""),
    );
  } catch {
    await interaction.followUp({ content: "ℹ️ Nie moglem wyslac DM (zamkniete wiadomosci). Status widoczny na stronie.", ephemeral: true });
  }
}

async function handleNagrodaAnuluj(interaction) {
  if (!isStaff(interaction)) {
    await interaction.reply({ content: "❌ Ta komenda jest tylko dla obslugi.", ephemeral: true });
    return;
  }

  const code = interaction.options.getString("kod", true).trim();
  await interaction.deferReply();

  const result = await callSite("/api/affiliate/rewards/complete", {
    code,
    action: "cancel",
    deliveredBy: interaction.user.tag,
  });

  if (!result.ok) {
    await interaction.editReply(`❌ ${result.data?.message || "Nie udalo sie anulowac zamowienia."}`);
    return;
  }

  const order = result.data.order;
  await interaction.editReply({
    embeds: [
      orderEmbed(order, {
        title: order.refunded ? "↩️ Anulowane, coiny zwrocone" : "↩️ Anulowane",
        color: 0xf87171,
        footer: `Anulowal: ${interaction.user.tag}`,
      }),
    ],
  });

  try {
    const user = await client.users.fetch(order.discordUserId);
    await user.send(
      `↩️ Twoje zamowienie **${order.rewardTitle}** (kod \`${order.code}\`) zostalo anulowane.` +
        (order.refunded ? ` Zwrocilismy **${order.rewardCost} JC**.` : ""),
    );
  } catch {}
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "nagroda") return await handleNagroda(interaction);
    if (interaction.commandName === "nagrodazrealizowana") return await handleNagrodaZrealizowana(interaction);
    if (interaction.commandName === "nagrodaanuluj") return await handleNagrodaAnuluj(interaction);
  } catch (error) {
    console.error(`[nagrody] Blad komendy /${interaction.commandName}:`, error);
    const message = "❌ Cos poszlo nie tak. Sprobuj ponownie.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.once("clientReady", async () => {
  console.log(`Bot zalogowany jako ${client.user?.tag}`);
  console.log(
    `Nasluch: guild=${GUILD_ID}, channel=${CHANNEL_ID || "ALL_CHANNELS"}`
  );
  await registerRewardCommands();
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== GUILD_ID) return;
  if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) return;

  const originalUrl = extractFirstUrl(message.content);
  if (!originalUrl) return;

  try {
    const converted = await convertAllLinks(originalUrl);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("Twoje przekonwertowane linki!")
      .setDescription("Kliknij przycisk ponizej, zeby otworzyc wybrany link.")
      .addFields({
        name: "Oryginalny link",
        value: originalUrl.length > 1024 ? `${originalUrl.slice(0, 1000)}...` : originalUrl,
      });

    const row = new ActionRowBuilder().addComponents(
      createAgentButton("USFans", converted.usfans, AGENT_META.usfans.buttonEmoji),
      createAgentButton("Kakobuy", converted.kakobuy, AGENT_META.kakobuy.buttonEmoji),
      createAgentButton("LitBuy", converted.litbuy, AGENT_META.litbuy.buttonEmoji),
      createAgentButton("Raw Link", converted.rawlink, AGENT_META.rawlink.buttonEmoji),
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
