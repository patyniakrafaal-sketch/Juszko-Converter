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
// Accepts several ids separated by commas/spaces, so access can be given to more than
// one role without redeploying (e.g. staff plus a dedicated rewards role).
// Both spellings are accepted because the singular name is easy to type as a plural when
// the value is a list.
const STAFF_ROLE_IDS = String(
  process.env.STAFF_ROLE_ID || process.env.STAFF_ROLE_IDS || process.env.DISCORD_ADMIN_ROLE_ID || "",
)
  .split(/[,\s]+/)
  .map((id) => id.trim())
  .filter(Boolean);
const STAFF_ROLE_ID = STAFF_ROLE_IDS[0] || "";
const AFFCODE = process.env.AFFCODE?.trim() || "juszko20";
const USFANS_EMOJI_ID = process.env.USFANS_EMOJI_ID?.trim() || "";
const KAKOBUY_EMOJI_ID = process.env.KAKOBUY_EMOJI_ID?.trim() || "";
const LITBUY_EMOJI_ID = process.env.LITBUY_EMOJI_ID?.trim() || "";
const RAWLINK_EMOJI_ID = process.env.RAWLINK_EMOJI_ID?.trim() || "";
// --- Wyglad -----------------------------------------------------------------
//
// Discord renders no CSS, so the only design surface is colour, layout and icons.
// Keeping all three in one place is what makes the replies look like one product
// instead of six commands written on different days.

const BRAND = {
  name: "JuszkoReps",
  site: (process.env.SITE_URL?.trim() || "https://juszkoreps-czjp.onrender.com").replace(/\/+$/, ""),
  // The small round image next to the author line on every embed.
  logo: process.env.BRAND_LOGO_URL?.trim() || "",
};

const COLORS = {
  brand: 0xf5c518, // amber - the site's accent
  success: 0x2ecc71,
  danger: 0xe74c3c,
  info: 0x5865f2, // Discord blurple, for neutral information
  muted: 0x2b2d31, // matches the dark embed background, for quiet cards
};

/**
 * Every icon in the bot, overridable per entry with an env var.
 *
 * Set e.g. ICON_COIN=<:jc:1234567890> to swap the unicode fallback for a server
 * emoji. The full `<:name:id>` form is what Discord's emoji picker gives you when
 * you type a backslash before an emoji, so it can be pasted straight in.
 */
function icon(envName, fallback) {
  return process.env[envName]?.trim() || fallback;
}

/**
 * The same icons, served as images from the site instead of uploaded as server emoji.
 *
 * Worth knowing where this can and cannot be used: Discord only accepts a URL in the
 * slots that take an image - thumbnail, author icon, footer icon, main image. Text
 * inside a title or a field is plain text, so an icon there HAS to be an emoji; there
 * is no syntax for putting a hosted picture in a line of text. The ICON map above still
 * covers those, and these URLs cover everywhere an image is allowed.
 *
 * Upside over emoji: nothing to upload, no per-server emoji slots used, and updating an
 * icon is a redeploy of the site rather than a re-upload on every server.
 */
const ICON_BASE = (process.env.ICON_BASE_URL?.trim() || `${BRAND.site}/bot-icons`).replace(/\/+$/, "");

function iconUrl(name) {
  return `${ICON_BASE}/${name}.png`;
}

const IMG = {
  coin: iconUrl("coin"),
  gift: iconUrl("gift"),
  pending: iconUrl("pending"),
  done: iconUrl("done"),
  cancelled: iconUrl("cancelled"),
  error: iconUrl("error"),
  info: iconUrl("info"),
  plus: iconUrl("plus"),
  minus: iconUrl("minus"),
  user: iconUrl("user"),
  code: iconUrl("code"),
  staff: iconUrl("staff"),
  wallet: iconUrl("wallet"),
};

const ICON = {
  coin: icon("ICON_COIN", "🪙"),
  gift: icon("ICON_GIFT", "🎁"),
  pending: icon("ICON_PENDING", "🟡"),
  done: icon("ICON_DONE", "✅"),
  cancelled: icon("ICON_CANCELLED", "🚫"),
  error: icon("ICON_ERROR", "⛔"),
  info: icon("ICON_INFO", "💡"),
  plus: icon("ICON_PLUS", "📈"),
  minus: icon("ICON_MINUS", "📉"),
  user: icon("ICON_USER", "👤"),
  code: icon("ICON_CODE", "🔑"),
  staff: icon("ICON_STAFF", "🛡️"),
  wallet: icon("ICON_WALLET", "💳"),
};

/**
 * Base embed every reply is built from: same author line, same footer, same
 * timestamp. Consistency is most of what "professional" means here.
 */
function brandEmbed(color = COLORS.brand) {
  const embed = new EmbedBuilder().setColor(color).setTimestamp();
  const author = { name: BRAND.name, url: BRAND.site };
  if (BRAND.logo) author.iconURL = BRAND.logo;
  return embed.setAuthor(author);
}

/** Thin horizontal rule. Discord has no divider, so a field of spacers stands in. */
const DIVIDER = "▬".repeat(18);

function errorEmbed(message, hint) {
  const embed = brandEmbed(COLORS.danger)
    .setDescription(`**${message}**`)
    .setThumbnail(IMG.error);
  if (hint) embed.addFields({ name: "Co zrobic", value: hint });
  return embed;
}

function infoEmbed(message) {
  return brandEmbed(COLORS.info).setDescription(message).setThumbnail(IMG.info);
}

/** Renders an amount as a padded code block so columns line up between replies. */
function coins(amount) {
  return `${ICON.coin} \`${Number(amount).toLocaleString("pl-PL")} JC\``;
}

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
  new SlashCommandBuilder()
    .setName("dodajcoins")
    .setDescription("Dodaj Juszko Coins uzytkownikowi (tylko obsluga)")
    .addUserOption((option) => option.setName("uzytkownik").setDescription("Komu dodac").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("ilosc").setDescription("Ile coinow dodac").setRequired(true).setMinValue(1).setMaxValue(1000000),
    )
    .addStringOption((option) => option.setName("powod").setDescription("Powod (widoczny w historii)").setRequired(false)),
  new SlashCommandBuilder()
    .setName("zabierzcoins")
    .setDescription("Odejmij Juszko Coins uzytkownikowi (tylko obsluga)")
    .addUserOption((option) => option.setName("uzytkownik").setDescription("Komu odjac").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("ilosc").setDescription("Ile coinow odjac").setRequired(true).setMinValue(1).setMaxValue(1000000),
    )
    .addStringOption((option) => option.setName("powod").setDescription("Powod (widoczny w historii)").setRequired(false)),
  new SlashCommandBuilder()
    .setName("saldo")
    .setDescription("Sprawdz swoje saldo coinow")
    .addUserOption((option) =>
      option.setName("uzytkownik").setDescription("Czyje saldo (tylko obsluga)").setRequired(false),
    ),
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
  // Render puts free instances to sleep, so the first call after a quiet spell can hang
  // for a long time. Without a deadline the interaction token expires while we wait and
  // the user is left staring at "thinking..." with no error to act on.
  let response;
  try {
    response = await fetch(`${SITE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": SITE_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    console.error(`[nagrody] ${path} nie odpowiedzialo:`, error?.name || error);
    return {
      ok: false,
      status: 0,
      data: { message: "Strona nie odpowiada. Sprobuj ponownie za chwile." },
    };
  }

  const data = await response.json().catch(() => null);

  // A 401 here means the bot and the site disagree about INTERNAL_API_KEY. That is a
  // deployment problem, not something the user did, so say so instead of "nie udalo sie".
  if (response.status === 401) {
    console.error(`[nagrody] ${path} zwrocilo 401 - INTERNAL_API_KEY nie zgadza sie ze strona.`);
    return {
      ok: false,
      status: 401,
      data: { message: "Bot nie ma autoryzacji do strony. Zglos to administratorowi." },
    };
  }

  return { ok: response.ok && data?.ok === true, status: response.status, data };
}

function isStaff(interaction) {
  // Server managers always pass, so access cannot be locked out by a bad role id.
  if (interaction.memberPermissions?.has("ManageGuild")) return true;
  if (!STAFF_ROLE_IDS.length) return false;

  const roles = interaction.member?.roles;
  // roles is a GuildMemberRoleManager on a cached member, but a plain id array when
  // Discord sends the member uncached with the interaction.
  const has = (id) =>
    Array.isArray(roles) ? roles.includes(id) : Boolean(roles?.cache?.has(id));

  return STAFF_ROLE_IDS.some(has);
}

// A bare "you are not staff" gives no way to tell a missing env var apart from a missing
// role, which is exactly the thing that is wrong when this fires unexpectedly.
async function denyStaff(interaction) {
  const roles = interaction.member?.roles;
  const owned = Array.isArray(roles) ? roles : [...(roles?.cache?.keys() ?? [])];

  const detail = !STAFF_ROLE_IDS.length
    ? "Bot nie ma ustawionej zmiennej STAFF_ROLE_ID, wiec nie wie ktora rola to obsluga."
    : `Wymagana rola: ${STAFF_ROLE_IDS.map((id) => `<@&${id}>`).join(" lub ")}.\nTwoje role: ${
        owned.length ? owned.map((id) => `<@&${id}>`).join(", ") : "brak"
      }`;

  await interaction.reply({
    embeds: [
      brandEmbed(COLORS.danger)
        .setTitle(`${ICON.staff}  Brak uprawnien`)
        .setThumbnail(IMG.staff)
        .setDescription("Ta komenda jest tylko dla obslugi.")
        .addFields({ name: "Dlaczego", value: detail }),
    ],
    ephemeral: true,
    allowedMentions: { parse: [] },
  });
}

function orderEmbed(order, { title, color, footer, statusIcon, statusImage }) {
  // The reward name is the thing everyone is looking for, so it carries the visual
  // weight as the description instead of being the first of four equal fields.
  const embed = brandEmbed(color)
    .setTitle(`${statusIcon || ICON.gift}  ${title}`)
    .setDescription(`### ${order.rewardTitle || "Nagroda"}\n${DIVIDER}`)
    .addFields(
      { name: `${ICON.code} Kod odbioru`, value: `\`\`\`${order.code}\`\`\``, inline: false },
      { name: `${ICON.coin} Zaplacono`, value: coins(order.rewardCost), inline: true },
      {
        name: `${ICON.user} Kupujacy`,
        value: order.discordUserId ? `<@${order.discordUserId}>` : "—",
        inline: true,
      },
    );

  embed.setThumbnail(statusImage || IMG.gift);
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
    await interaction.editReply({ embeds: [errorEmbed(message)] });
    return;
  }

  const order = result.data.order;
  await interaction.editReply({
    content: STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}> nowa nagroda do wydania` : undefined,
    embeds: [
      orderEmbed(order, {
        title: "Nagroda do wydania",
        statusIcon: ICON.pending,
        statusImage: IMG.pending,
        color: COLORS.brand,
        footer: "Obsluga: po wydaniu wpisz /nagrodazrealizowana z tym kodem",
      }),
    ],
  });
}

async function handleNagrodaZrealizowana(interaction) {
  if (!isStaff(interaction)) {
    await denyStaff(interaction);
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
    await interaction.editReply({ embeds: [errorEmbed(result.data?.message || "Nie udalo sie oznaczyc jako wydane.")] });
    return;
  }

  const order = result.data.order;
  await interaction.editReply({
    embeds: [
      orderEmbed(order, {
        title: "Nagroda wydana",
        statusIcon: ICON.done,
        statusImage: IMG.done,
        color: COLORS.success,
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
    await denyStaff(interaction);
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
    await interaction.editReply({ embeds: [errorEmbed(result.data?.message || "Nie udalo sie anulowac zamowienia.")] });
    return;
  }

  const order = result.data.order;
  await interaction.editReply({
    embeds: [
      orderEmbed(order, {
        title: order.refunded ? "Anulowane — coiny zwrocone" : "Anulowane",
        statusIcon: ICON.cancelled,
        statusImage: IMG.cancelled,
        color: COLORS.danger,
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

async function handleCoins(interaction, sign) {
  if (!isStaff(interaction)) {
    await denyStaff(interaction);
    return;
  }

  const target = interaction.options.getUser("uzytkownik", true);
  const amount = interaction.options.getInteger("ilosc", true);
  const reason = interaction.options.getString("powod")?.trim() || null;
  await interaction.deferReply();

  const result = await callSite("/api/affiliate/coins/grant", {
    discordUserId: target.id,
    username: target.username,
    amount: sign * amount,
    reason,
    grantedBy: interaction.user.tag,
  });

  if (!result.ok) {
    await interaction.editReply({ embeds: [errorEmbed(result.data?.message || "Nie udalo sie zmienic salda.")] });
    return;
  }

  const { balanceBefore, balanceAfter } = result.data;
  const added = sign > 0;

  const embed = brandEmbed(added ? COLORS.success : COLORS.danger)
    .setTitle(`${added ? ICON.plus : ICON.minus}  ${added ? "Dodano coiny" : "Odjeto coiny"}`)
    .setDescription(`### ${added ? "+" : "−"}${amount.toLocaleString("pl-PL")} JC\n${DIVIDER}`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: `${ICON.user} Uzytkownik`, value: `<@${target.id}>`, inline: true },
      {
        name: `${ICON.wallet} Saldo`,
        // The arrow makes before/after readable at a glance; bold marks the value
        // that matters now.
        value: `\`${balanceBefore}\` → **\`${balanceAfter} JC\`**`,
        inline: true,
      },
    );

  if (reason) embed.addFields({ name: `${ICON.info} Powod`, value: reason, inline: false });
  embed.setFooter({ text: `Wykonal: ${interaction.user.tag}`, iconURL: added ? IMG.plus : IMG.minus });

  await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });

  // The DM is the only part most users ever see, so it gets the same treatment
  // rather than being a bare line of text.
  try {
    const dm = brandEmbed(added ? COLORS.success : COLORS.danger)
      .setTitle(`${added ? ICON.plus : ICON.minus}  ${added ? "Otrzymales coiny" : "Odjeto Ci coiny"}`)
      .setDescription(
        `### ${added ? "+" : "−"}${amount.toLocaleString("pl-PL")} JC\n${DIVIDER}`,
      )
      .addFields({ name: `${ICON.wallet} Twoje saldo`, value: coins(balanceAfter), inline: true });

    if (reason) dm.addFields({ name: `${ICON.info} Powod`, value: reason, inline: false });
    dm.setFooter({ text: "Nagrody znajdziesz w zakladce Zarabiaj z nami", iconURL: IMG.gift });

    await target.send({ embeds: [dm] });
  } catch {}
}

async function handleSaldo(interaction) {
  // Checking your own balance is not a staff action - the reply is ephemeral, so nobody
  // learns anything they could not already see on the site. Only reading someone else's is.
  const requested = interaction.options.getUser("uzytkownik", false);
  const self = !requested || requested.id === interaction.user.id;

  if (!self && !isStaff(interaction)) {
    await denyStaff(interaction);
    return;
  }

  const target = requested ?? interaction.user;
  await interaction.deferReply({ ephemeral: true });

  const result = await callSite("/api/affiliate/coins/balance", { discordUserId: target.id });

  if (!result.ok) {
    await interaction.editReply({ embeds: [errorEmbed(result.data?.message || "Nie udalo sie odczytac salda.")] });
    return;
  }

  if (!result.data.exists) {
    await interaction.editReply({
      embeds: [
        infoEmbed(
          self
            ? `Nie masz jeszcze konta afiliacyjnego.\nZaloguj sie na [stronie](${BRAND.site}/zarabiaj-z-nami) przez Discord, zeby je zalozyc.`
            : `<@${target.id}> nie ma jeszcze konta afiliacyjnego (0 JC).`,
        ),
      ],
      allowedMentions: { parse: [] },
    });
    return;
  }

  // The number is the whole point of the command, so it gets heading size rather
  // than being buried in a sentence.
  const embed = brandEmbed(COLORS.brand)
    .setTitle(`${ICON.wallet}  ${self ? "Twoje saldo" : "Saldo uzytkownika"}`)
    .setDescription(`# ${Number(result.data.balance).toLocaleString("pl-PL")} JC\n${DIVIDER}`)
    .addFields({ name: `${ICON.user} Konto`, value: `<@${target.id}>`, inline: true })
    .setThumbnail(target.displayAvatarURL())
    .setFooter({ text: "Nagrode wymienisz na stronie, odbierzesz komenda /nagroda", iconURL: IMG.wallet });

  await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "nagroda") return await handleNagroda(interaction);
    if (interaction.commandName === "nagrodazrealizowana") return await handleNagrodaZrealizowana(interaction);
    if (interaction.commandName === "nagrodaanuluj") return await handleNagrodaAnuluj(interaction);
    if (interaction.commandName === "dodajcoins") return await handleCoins(interaction, 1);
    if (interaction.commandName === "zabierzcoins") return await handleCoins(interaction, -1);
    if (interaction.commandName === "saldo") return await handleSaldo(interaction);
  } catch (error) {
    console.error(`[nagrody] Blad komendy /${interaction.commandName}:`, error);
    const payload = {
      embeds: [errorEmbed("Cos poszlo nie tak.", "Sprobuj ponownie za chwile.")],
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
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
