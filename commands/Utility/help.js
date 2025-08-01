const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");




const { configEmbed } = require("../../utils/mainUtils.js");

module.exports = {
  enabled: config.commands.help.enabled,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get helpful information and commands.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits[config.commands.help.permission],
    )
    .setDMPermission(false),
  async execute(interaction) {
    const isEphemeral =
      config.helpEmbed.ephemeral !== undefined
        ? config.helpEmbed.ephemeral
        : true;
    await interaction.deferReply({
      flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
    });

    const defaultDMValues = {
      color: "#2FF200",
      title: "Help",
      timestamp: true,
      footer: {
        text: `Requested by ${interaction.user.username}`,
        iconURL: `${interaction.user.displayAvatarURL({ extension: "png", size: 1024 })}`,
      },
    };

    const helpEmbed = await configEmbed("helpEmbed", defaultDMValues);

    helpEmbed.addFields([
      {
        name: "🎫 Tickets",
        value:
          (config.commands.add?.enabled
            ? "> `/add` - Add a user or role to a ticket channel.\n"
            : "") +
          (config.commands.alert?.enabled
            ? "> `/alert` - Alert the ticket creator or another user in a ticket.\n"
            : "") +
          (config.commands.claim?.enabled
            ? "> `/claim` - Claim a ticket.\n"
            : "") +
          (config.commands.close?.enabled
            ? "> `/close` - Close a ticket.\n"
            : "") +
          (config.commands.closerequest?.enabled
            ? "> `/closerequest` - Request closing a ticket.\n"
            : "") +
          (config.commands.delete?.enabled
            ? "> `/delete` - Delete a ticket.\n"
            : "") +
          (config.commands.move?.enabled
            ? "> `/move` - Move a ticket channel from one category to another.\n"
            : "") +
          (config.commands.panel?.enabled
            ? "> `/panel` - Send the ticket panel in the channel.\n"
            : "") +
          (config.commands.pin?.enabled
            ? "> `/pin` - Pin the ticket channel in the category.\n"
            : "") +
          (config.commands.priority?.enabled
            ? "> `/priority add` - Add a priority to a ticket.\n> `/priority remove` - Remove the priority from a ticket.\n"
            : "") +
          (config.commands.remove?.enabled
            ? "> `/remove` - Remove a user or role from a ticket channel.\n"
            : "") +
          (config.commands.rename?.enabled
            ? "> `/rename` - Rename a ticket | Placeholders: {user}, {type}\n"
            : "") +
          (config.commands.reopen?.enabled
            ? "> `/reopen` - Re-Open a closed ticket.\n"
            : "") +
          (config.commands.slowmode?.enabled
            ? "> `/slowmode` - Add slowmode to a ticket channel.\n"
            : "") +
          (config.commands.topic?.enabled
            ? "> `/topic` - Change the topic of a ticket | Placeholders: {user}, {user.tag}, {type}\n"
            : "") +
          (config.commands.transcript?.enabled
            ? "> `/transcript` - Manually save the transcript of a ticket.\n"
            : "") +
          (config.commands.transfer?.enabled
            ? "> `/transfer` - Transfer the ownership of a ticket to another user.\n"
            : "") +
          (config.commands.unclaim?.enabled
            ? "> `/unclaim` - Unclaim a ticket.\n"
            : ""),
      },
      {
        name: "🎫 Tickets",
        value: config.commands.tickets?.enabled
          ? "> `/tickets` - List the current tickets of a user.\n"
          : "",
      },
      {
        name: "🛠️ Utility",
        value:
          "> `/help` - Get helpful information and commands.\n" +
          (config.commands.blacklist?.enabled
            ? "> `/blacklist add` - Add users or roles to the blacklist.\n> `/blacklist remove` - Remove users or roles from the blacklist.\n> `/blacklist list` - List users or roles currently in the blacklist.\n"
            : "") +
          (config.commands.stats?.enabled
            ? "> `/stats list` - List useful stats.\n > `/stats set` - Adjust some of the statistics.\n"
            : "") +
          (config.commands.preference?.enabled
            ? "> `/preference` - Allows users to set their own preference for receiving DMs.\n"
            : "") +
          (config.commands.ping?.enabled
            ? "> `/ping` - Get the bot's ping.\n"
            : "") +
          (config.commands.userInfo?.enabled
            ? "> `/userinfo` - Get useful information about a user.\n"
            : "") +
          "> `/reload` - Reload the commands.\n",
      },
      {
        name: "🖱️ Context Menu",
        value:
          (config.contextMenuCommands.blacklistAdd?.enabled
            ? "> `Blacklist Add` - Add a user to the blacklist. (User Command)\n"
            : "") +
          (config.contextMenuCommands.blacklistRemove?.enabled
            ? "> `Blacklist Remove` - Remove a user from the blacklist. (User Command)\n"
            : "") +
          (config.contextMenuCommands.ticketAlert?.enabled
            ? "> `Ticket Alert` - Alert a user in a ticket. (User Command)\n"
            : "") +
          (config.contextMenuCommands.ticketPin?.enabled
            ? "> `Ticket Pin` - Pin the ticket channel in the category (Message Command)\n"
            : "") +
          (config.contextMenuCommands.ticketTranscript?.enabled
            ? "> `Ticket Transcript` - Manually save the transcript of a ticket. (Message Command)\n"
            : "") +
          (config.contextMenuCommands.ticketClaim?.enabled
            ? "> `Ticket Claim` - Claim a ticket. (Message Command)\n"
            : "") +
          (config.contextMenuCommands.ticketUnclaim?.enabled
            ? "> `Ticket Unclaim` - Unclaim a ticket. (Message Command)\n"
            : "") +
          (config.contextMenuCommands.ticketCloseRequest?.enabled
            ? "> `Ticket Close Request` - Request closing a ticket. (Message Command)\n"
            : "") +
          (config.contextMenuCommands.ticketsList?.enabled
            ? "> `Tickets List` - List the current tickets of a user. (User Command)\n"
            : "") +
          (config.contextMenuCommands.userInfo?.enabled
            ? "> `User Info` - Get useful information about a user. (User Command)\n"
            : "") +
          "\n**Note:** Context Menu commands are right click commands, some can be used by right clicking on a message and others on users.",
      },
    ]);

    await interaction.editReply({
      embeds: [helpEmbed],
      flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
    });
  },
};
