const { EmbedBuilder, AttachmentBuilder, MessageFlags } = require("discord.js");
const dotenv = require("dotenv");
dotenv.config();
const discordHtmlTranscripts = require("discord-html-transcripts");
const fs = require("fs");
const yaml = require("yaml");
const configFile = fs.readFileSync("./config.yml", "utf8");
const config = yaml.parse(configFile);
const packageJson = require("../package.json");
const {
  client,
  mainDB,
  ticketsDB,
  ticketCategories,
  blacklistDB,
} = require("../init.js");
const date = new Date();
const options = {
  timeZoneName: "short",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: true,
};
const timeString = date.toLocaleString("en-US", options);

async function logMessage(message) {
  const logMessage = `[${timeString}] [Bot v${packageJson.version}] [NodeJS ${process.version}] [LOG] ${message}\n\n`;

  try {
    await fs.promises.appendFile("./logs.txt", logMessage);
  } catch (error) {
    error.errorContext = `[logMessage Function Error]: error writing to log file`;
    client.emit("error", error);
  }
}

async function checkSupportRole(interaction) {
  const foundId = await ticketsDB.get(`${interaction.channel.id}.button`);
  const allowedRoles = ticketCategories[foundId].support_role_ids;
  return interaction.member.roles.cache.some((role) =>
    allowedRoles.includes(role.id),
  );
}

async function addTicketCreator(userID) {
  let ticketCreators = (await mainDB.get("ticketCreators")) || [];
  let existingCreator = ticketCreators.find(
    (creator) => creator.userID === userID,
  );

  if (existingCreator) {
    existingCreator.ticketsCreated++;
  } else {
    ticketCreators.push({ userID: userID, ticketsCreated: 1 });
  }

  await mainDB.set("ticketCreators", ticketCreators);
}

async function getUser(id) {
  let user = client.users.cache.get(id);

  if (user) {
    return user;
  } else {
    try {
      user = await client.users.fetch(id);
      return user;
    } catch (error) {
      error.errorContext = `[getUser Function Error]: error fetching user with ID ${id}`;
      client.emit("error", error);
      return null;
    }
  }
}

async function getMember(id) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  let member = guild.members.cache.get(id);

  if (member) {
    return member;
  } else {
    try {
      member = await guild.members.fetch(id);
      return member;
    } catch (error) {
      error.errorContext = `[getMember Function Error]: error fetching member with ID ${id}`;
      client.emit("error", error);
      return null;
    }
  }
}

async function getRole(id) {
  let role = client.guilds.cache.get(process.env.GUILD_ID).roles.cache.get(id);

  if (role) {
    return role;
  } else {
    try {
      role = await client.guilds.cache
        .get(process.env.GUILD_ID)
        .roles.fetch(id);
      return role;
    } catch (error) {
      error.errorContext = `[getRole Function Error]: error fetching role with ID ${id}`;
      client.emit("error", error);
      return null;
    }
  }
}

async function getChannel(id) {
  let channel = client.channels.cache.get(id);

  if (channel) {
    return channel;
  } else {
    try {
      channel = await client.channels.fetch(id);
      return channel;
    } catch (error) {
      error.errorContext = `[getChannel Function Error]: error fetching channel with ID ${id}`;
      client.emit("error", error);
      return null;
    }
  }
}

const findAvailableCategory = async (categoryIDs) => {
  if (!Array.isArray(categoryIDs)) {
    throw new Error(
      'categoryID and closedCategoryID of each configured ticket category must be an array, such as ["ID"]',
    );
  }
  for (const categoryID of categoryIDs) {
    const category = await getChannel(categoryID);
    const channelCount = category.children.cache.size;
    if (channelCount < 50) {
      return categoryID;
    }
  }
  return null; // No available category found
};

async function getPermissionOverwrites(
  permissions,
  type = "open",
  defaults = {},
) {
  const permissionOverwrites = {};
  const allowPermissions = permissions?.[type]?.allow || defaults?.allow || [];
  const denyPermissions = permissions?.[type]?.deny || defaults?.deny || [];
  await Promise.all(
    allowPermissions.map(async (permission) => {
      permissionOverwrites[permission] = true;
    }),
  );
  await Promise.all(
    denyPermissions.map(async (permission) => {
      permissionOverwrites[permission] = false;
    }),
  );
  return permissionOverwrites;
}

async function configEmbed(configPath, defaultValues = {}) {
  const embed = new EmbedBuilder();
  let configValue;
  if (Array.isArray(configPath) && configPath[0] === "panelEmbed") {
    const panelIndex = configPath[1];
    configValue = config.panels[panelIndex].panelEmbed;
  } else {
    configValue = config[configPath];
  }

  embed.setColor(configValue?.color || defaultValues?.color || "#2FF200");

  if (configValue?.description !== "" && configValue?.description !== null) {
    embed.setDescription(
      configValue?.description || defaultValues?.description || null,
    );
  }

  if (configValue?.title !== "" && configValue?.title !== null) {
    embed.setTitle(configValue?.title || defaultValues?.title);
  }

  if (configValue?.URL !== "" && configValue?.URL !== null) {
    embed.setURL(configValue?.URL || defaultValues?.URL);
  }

  if (configValue?.image !== "" && configValue?.image !== null) {
    embed.setImage(configValue?.image || defaultValues?.image);
  }

  if (configValue?.thumbnail !== "" && configValue?.thumbnail !== null) {
    embed.setThumbnail(configValue?.thumbnail || defaultValues?.thumbnail);
  }

  if (configValue?.timestamp === true) {
    embed.setTimestamp();
  } else if (
    configValue?.timestamp !== false &&
    defaultValues?.timestamp === true
  ) {
    embed.setTimestamp();
  }

  // Setting author and footer
  if (configValue?.author?.name !== "" && configValue?.author?.name !== null) {
    const authorValues = {
      name: configValue?.author?.name || defaultValues?.author?.name || null,
      url:
        configValue?.author?.url !== "" && configValue?.author?.url !== null
          ? configValue?.author?.url || defaultValues?.author?.url
          : undefined,
      iconURL:
        configValue?.author?.iconURL !== "" &&
        configValue?.author?.iconURL !== null
          ? configValue?.author?.iconURL || defaultValues?.author?.iconURL
          : undefined,
    };
    embed.setAuthor(authorValues);
  }

  if (configValue?.footer?.text !== "" && configValue?.footer?.text !== null) {
    const footerValues = {
      text: configValue?.footer?.text || defaultValues?.footer?.text || null,
      iconURL:
        configValue?.footer?.iconURL !== "" &&
        configValue?.footer?.iconURL !== null
          ? configValue?.footer?.iconURL || defaultValues?.footer?.iconURL
          : undefined,
    };
    embed.setFooter(footerValues);
  }

  return embed;
}

async function saveTranscript(
  interaction,
  ticketChannel,
  saveImages = false,
  user = null,
) {
  const createTranscriptOptions = {
    limit: -1,
    saveImages,
    returnType: "buffer",
    poweredBy: false,
  };

  let channel;
  if (interaction) {
    channel = interaction.channel;
  } else if (ticketChannel) {
    channel = ticketChannel;
  }

  if (channel) {
    let fileName = config.transcriptName || "{channelName}-transcript";
    fileName = fileName.replace(/\{channelName\}/g, channel.name);
    if (user) {
      const member = await getMember(user.id);
      fileName = fileName
        .replace(/\{username\}/g, user.username)
        .replace(
          /\{displayName\}/g,
          member ? member.displayName : user.username,
        );
    }
    const attachmentBuffer = await discordHtmlTranscripts.createTranscript(
      channel,
      {
        ...createTranscriptOptions,
        fileName,
      },
    );
    return new AttachmentBuilder(Buffer.from(attachmentBuffer), {
      name: `${fileName}.html`,
    });
  }

  return null;
}

async function saveTranscriptTxt(interaction, ticketChannel, user = null) {
  let channel;
  if (interaction) {
    channel = interaction.channel;
  } else if (ticketChannel) {
    channel = ticketChannel;
  }
  let lastId;
  let transcript = [];
  let totalFetched = 0;
  let ticketUserID = await getUser(await ticketsDB.get(`${channel.id}.userID`));
  let claimUserID = await ticketsDB.get(`${channel.id}.claimUser`);
  let claimUser;

  if (claimUserID) {
    claimUser = await getUser(claimUserID);
  }

  while (true) {
    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    const fetched = await channel.messages.fetch(options);
    totalFetched += fetched.size;
    lastId = fetched.lastKey();

    const newLines = fetched.map((m) => {
      let messageText = `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.username}: `;

      if (m.content) {
        messageText += m.content;
        if (m.attachments.size > 0) {
          messageText += " ";
        }
      }

      if (m.attachments.size > 0) {
        const attachmentText = m.attachments
          .map((attachment) => attachment.proxyURL)
          .join("\n");
        messageText += attachmentText;
      }

      if (m.embeds.length > 0) {
        const embedText = m.embeds
          .map((embed) => {
            let embedFields = "";

            if (embed.fields && embed.fields.length > 0) {
              embedFields = embed.fields
                .map((field) => `${field.name} : ${field.value}`)
                .join("\n");
            }

            let embedContent = "";
            if (embed.title) {
              embedContent += `Embed Title: ${embed.title}\n`;
            }
            if (embed.description) {
              embedContent += `Embed Description: ${embed.description}\n`;
            }
            if (embedFields) {
              embedContent += `${embedFields}\n`;
            }

            return embedContent.trim();
          })
          .filter((embedText) => embedText !== "")
          .join("\n");

        messageText += embedText;
      }

      return messageText;
    });

    transcript.push(...newLines);

    // break when there are no more messages
    if (fetched.size < 100) break;
  }

  const deletedBy = interaction?.user?.tag || client.user.tag || "Automation";
  const guildName =
    interaction?.guild?.name ||
    client.guilds.cache.get(process.env.GUILD_ID).name;
  const additionalInfo = `Server: ${guildName}\nTicket: #${channel.name}\nCategory: ${await ticketsDB.get(`${channel.id}.ticketType`)}\nTicket Author: ${ticketUserID.tag}\nDeleted By: ${deletedBy}\nClaimed By: ${claimUser ? claimUser.tag : "None"}\n`;
  const finalTranscript = [additionalInfo, ...transcript.reverse()];
  finalTranscript.push(`\nTotal messages: ${totalFetched}`);
  let fileName = config.transcriptName || "{channelName}-transcript";
  fileName = fileName.replace(/\{channelName\}/g, channel.name);
  if (user) {
    const member = await getMember(user.id);
    fileName = fileName
      .replace(/\{username\}/g, user.username)
      .replace(/\{displayName\}/g, member ? member.displayName : user.username);
  }

  return new AttachmentBuilder(Buffer.from(finalTranscript.join("\n")), {
    name: `${fileName}.txt`,
  });
}

async function countMessagesInTicket(channel, lastId = null) {
  let messageCount = 0;

  while (true) {
    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    const messages = await channel.messages.fetch(options);
    messageCount += messages.size;
    lastId = messages.lastKey();

    // break when there are no more messages
    if (messages.size < 100) break;
  }
  return messageCount;
}

function parseDurationToMilliseconds(duration) {
  if (!duration) {
    return 0;
  }

  const unitMap = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 604800000,
  };

  const numericValue = parseInt(duration, 10);
  const unit = duration.slice(-1);

  return numericValue * unitMap[unit] || 0;
}

function isBlacklistExpired(timestamp, duration) {
  if (duration === "permanent" || duration === undefined) {
    return false; // Treat undefined or 'permanent' as permanent blacklist
  }
  const durationInMilliseconds = parseDurationToMilliseconds(duration);
  const expirationTime = timestamp + durationInMilliseconds;
  return Date.now() >= expirationTime;
}

async function cleanBlacklist() {
  const currentTime = Date.now();
  const blacklistedUsers = (await blacklistDB.all()) || [];
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const userArray = blacklistedUsers.filter(
    (entry) =>
      entry.id.startsWith("user-") && entry.value.duration !== "permanent",
  );
  const rolesArray = blacklistedUsers.filter(
    (entry) =>
      entry.id.startsWith("role-") && entry.value.duration !== "permanent",
  );

  if (userArray.length > 0) {
    for (const { id, value } of userArray) {
      const userId = id.split("-")[1];
      const member =
        guild.members.cache.get(userId) || (await guild.members.fetch(userId));
      const { timestamp, duration } = value;
      const expiryTime = timestamp + parseDurationToMilliseconds(duration);

      if (currentTime >= expiryTime) {
        await blacklistDB.delete(`user-${userId}`);
        const blacklistRoles = config.rolesOnBlacklist || [];
        blacklistRoles.forEach(async (roleId) => {
          const role = await getRole(roleId);
          if (role) {
            await member.roles
              .remove(role)
              .catch((error) =>
                console.error(
                  `Error removing role from blacklisted user: ${error}`,
                ),
              );
          } else {
            console.error(`Role with ID ${roleId} not found.`);
          }
        });
      }
    }
  }

  if (rolesArray.length > 0) {
    for (const { id, value } of rolesArray) {
      const roleId = id.split("-")[1];
      const { timestamp, duration } = value;
      const expiryTime = timestamp + parseDurationToMilliseconds(duration);

      if (currentTime >= expiryTime) {
        await blacklistDB.delete(`role-${roleId}`);
      }
    }
  }
}

async function getUserPreference(id, type) {
  const preference = await blacklistDB.get(`userPreference-${id}`);
  const defaultPref =
    config.commands.preference.defaultDM !== undefined
      ? config.commands.preference.defaultDM
      : true;
  if (preference === undefined || preference === null) {
    return defaultPref;
  } else if (preference[type] === undefined) {
    return defaultPref;
  } else {
    return preference[type];
  }
}

function formatTime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  let result = "";
  if (d > 0) result += `${d}d `;
  if (h > 0) result += `${h}h `;
  if (m > 0) result += `${m}m `;
  if (s > 0 || result === "") result += `${s}s`;

  return result.trim();
}

function sanitizeInput(input) {
  const formattingCharacters = ["_", "*", "`", "~", "|", "-"];
  const escapedInput = input.replace(
    new RegExp(`[${formattingCharacters.join("")}]`, "g"),
    "\\$&",
  );
  return escapedInput;
}

async function logError(errorType, error) {
  const errorContext =
    error?.errorContext !== undefined
      ? `\n[Error Context] -> ${error?.errorContext}`
      : "";
  const errorMessage = `[${timeString}] -> [Bot v${packageJson.version}] [Node.JS ${process.version}] [Type: ${errorType}]\n\n${error.stack}\n\n${errorContext}`;
  const logsFileToChannel = config?.logsFileToChannel ?? false;
  const logsFileChannelID = config?.logsFileChannelID ?? "";

  try {
    if (logsFileToChannel && logsFileChannelID) {
      const channel = await getChannel(logsFileChannelID);
      if (channel) {
        await channel.send(`\`\`\`\n${errorMessage}\n\`\`\``);
      } else {
        throw new Error("Channel not found for logging errors.");
      }
    } else {
      await fs.promises.appendFile("./logs.txt", errorMessage);
    }
  } catch (error) {
    error.errorContext = `[logError Function Error]: error writing to log file`;
    client.emit("error", error);
  }
}

async function lastUserMsgTimestamp(userId, channelId) {
  const channel = await getChannel(channelId);
  let lastId;
  let lastTimestamp = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    const fetched = await channel.messages.fetch(options);
    lastId = fetched.lastKey();

    for (const msg of fetched.values()) {
      if (msg.author.id === userId) {
        lastTimestamp = msg.createdTimestamp;
        break;
      }
    }

    // break when the timestamp is found or when there are no more messages to fetch
    if (lastTimestamp) break;
    if (fetched.size < 100) break;
  }
  return lastTimestamp;
}

async function lastChannelMsgTimestamp(channelId) {
  const channel = await getChannel(channelId);
  let lastId;
  let lastTimestamp = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    const fetched = await channel.messages.fetch(options);
    lastId = fetched.lastKey();

    for (const msg of fetched.values()) {
      if (msg.author.bot && config.autoCloseTickets.ignoreBots) {
        continue;
      }
      lastTimestamp = msg.createdTimestamp;
      break;
    }

    // break when the timestamp is found or when there are no more messages to fetch
    if (lastTimestamp) break;
    if (fetched.size < 100) break;
  }
  return lastTimestamp;
}

async function updateStatsChannels() {
  const statsChannels = config.statsChannels.channels;
  for (const statsChannel of statsChannels) {
    const { channelID, type, name } = statsChannel;
    const channel = await getChannel(channelID);
    if (!channel) {
      console.error(
        `Channel with ID ${channelID} not found, double check your configuration`,
      );
      continue;
    }
    if (type === "memberCount") {
      const memberCount = channel.guild.memberCount;
      await channel.setName(name.replace(/\{stats\}/g, memberCount));
      continue;
    }
    if (type === "avgTicketCreators") {
      const ticketCreators = (await mainDB.get("ticketCreators")) ?? [];
      const totalTicketCreators = ticketCreators.length;
      const averageTicketsCreated =
        ticketCreators.reduce(
          (total, creator) => total + creator.ticketsCreated,
          0,
        ) / totalTicketCreators;
      await channel.setName(
        name.replace(
          /\{stats\}/g,
          `${ticketCreators.length ? averageTicketsCreated.toFixed(0) : 0}`,
        ),
      );
      continue;
    }
    let stats = await mainDB.get(type);
    if (type === "ticketCreators") {
      stats = stats.length;
    }
    if (type === "ratings") {
      const averageRating =
        stats.reduce((total, current) => total + current, 0) / stats.length;
      let finalResult = stats.length ? averageRating.toFixed(1) : 0;
      await channel.setName(name.replace(/\{stats\}/g, finalResult));
      continue;
    }
    await channel.setName(name.replace(/\{stats\}/g, stats));
  }
}

async function listUserTickets(interaction, user, isEphemeral) {
  const tickets = (await ticketsDB.all()) || [];
  const userTickets = tickets.filter(
    (ticket) => ticket.value.userID === user.id,
  );

  const defaultValues = {
    color: "#2FF200",
    title: "Current tickets of {user}",
    timestamp: true,
    footer: {
      text: `Current Tickets of ${user.username}`,
      iconURL: `${user.displayAvatarURL({ extension: "png", size: 1024 })}`,
    },
  };

  const ticketsEmbed = await configEmbed("ticketsEmbed", defaultValues);

  if (ticketsEmbed.data && ticketsEmbed.data.title) {
    ticketsEmbed.setTitle(
      ticketsEmbed.data.title.replace(/\{user\}/g, user.username),
    );
  }

  let openTickets = [];
  let closedTickets = [];

  if (userTickets.length > 0) {
    for (const ticket of userTickets) {
      const channel = await getChannel(ticket.id);
      const ticketInfo = {
        id: ticket.id,
        name: channel.name,
        status: ticket.value.status,
        type: ticket.value.ticketType,
        creationTime: ticket.value.creationTime,
      };

      if (ticket.value.status === "Open") {
        openTickets.push(ticketInfo);
      } else {
        closedTickets.push(ticketInfo);
      }
    }
  }

  // Sort tickets by creation time
  openTickets.sort((a, b) => b.creationTime - a.creationTime);
  closedTickets.sort((a, b) => b.creationTime - a.creationTime);

  const openTicketsField = {
    name:
      config.ticketsEmbed.field_openTickets || "List of Currently Open Tickets",
    value:
      openTickets.length > 0
        ? openTickets
            .map(
              (ticket) =>
                `<#${ticket.id}> | ${ticket.name} | ${ticket.type}\nCreated on <t:${ticket.creationTime}:F>\n`,
            )
            .join("\n")
        : "No currently open tickets.",
  };

  const closedTicketsField = {
    name:
      config.ticketsEmbed.field_closedTickets ||
      "List of Currently Closed Tickets",
    value:
      closedTickets.length > 0
        ? closedTickets
            .map(
              (ticket) =>
                `<#${ticket.id}> | ${ticket.name} | ${ticket.type}\nCreated on <t:${ticket.creationTime}:F>\n`,
            )
            .join("\n")
        : "No currently closed tickets.",
  };

  ticketsEmbed.addFields(openTicketsField, closedTicketsField);

  await interaction.editReply({
    embeds: [ticketsEmbed],
    flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
  });
}

async function getFirstClosedTicket(userID) {
  const tickets = (await ticketsDB.all()) || [];
  const userTickets = tickets.filter(
    (ticket) =>
      ticket.value.userID === userID && ticket.value.status === "Closed",
  );
  return userTickets[0]?.id;
}

async function getBlacklistedEmbed(
  interaction,
  isUserBlacklisted,
  isRoleBlacklisted,
) {
  let expiryDate;
  let blacklistReason;
  let blacklistType;

  if (isUserBlacklisted) {
    const expirationTime =
      isUserBlacklisted?.timestamp +
      parseDurationToMilliseconds(isUserBlacklisted?.duration);
    expiryDate =
      isUserBlacklisted?.duration === "permanent"
        ? "Never"
        : `<t:${Math.floor(expirationTime / 1000)}:R>`;
    blacklistReason = isUserBlacklisted?.reason;
    blacklistType = "User";
  } else if (isRoleBlacklisted) {
    const expirationTime =
      isRoleBlacklisted?.timestamp +
      parseDurationToMilliseconds(isRoleBlacklisted?.duration);
    expiryDate =
      isRoleBlacklisted?.duration === "permanent"
        ? "Never"
        : `<t:${Math.floor(expirationTime / 1000)}:R>`;
    blacklistReason = isRoleBlacklisted?.reason;
    blacklistType = "Role";
  }

  const defaultblacklistedValues = {
    color: "#FF0000",
    title: "Blacklisted",
    description:
      "You are currently blacklisted from creating tickets.\nExpires: **{time}**\nReason: **{reason}**\nType: **{type}**",
    timestamp: true,
    footer: {
      text: `${interaction.user.tag}`,
      iconURL: `${interaction.user.displayAvatarURL({ extension: "png", size: 1024 })}`,
    },
  };

  const blacklistedEmbed = await configEmbed(
    "blacklistedEmbed",
    defaultblacklistedValues,
  );

  if (blacklistedEmbed.data && blacklistedEmbed.data.description) {
    blacklistedEmbed.setDescription(
      blacklistedEmbed.data.description
        .replace(/\{time\}/g, expiryDate)
        .replace(/\{reason\}/g, blacklistReason)
        .replace(/\{type\}/g, blacklistType),
    );
  }

  return blacklistedEmbed;
}

module.exports = {
  logMessage,
  checkSupportRole,
  addTicketCreator,
  getUser,
  getMember,
  getRole,
  getChannel,
  findAvailableCategory,
  getPermissionOverwrites,
  configEmbed,
  saveTranscript,
  saveTranscriptTxt,
  countMessagesInTicket,
  parseDurationToMilliseconds,
  isBlacklistExpired,
  cleanBlacklist,
  getUserPreference,
  formatTime,
  sanitizeInput,
  logError,
  lastUserMsgTimestamp,
  lastChannelMsgTimestamp,
  updateStatsChannels,
  listUserTickets,
  getFirstClosedTicket,
  getBlacklistedEmbed,
};
