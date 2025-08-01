const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");




const { userInfo } = require("../../utils/userInfo.js");

module.exports = {
  enabled: config.contextMenuCommands.userInfo.enabled,
  data: new ContextMenuCommandBuilder()
    .setName("User Info")
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(
      PermissionFlagsBits[config.contextMenuCommands.userInfo.permission],
    )
    .setDMPermission(false),
  async execute(interaction) {
    const isEphemeral =
      config.userInfoEmbed.ephemeral !== undefined
        ? config.userInfoEmbed.ephemeral
        : true;
    const member = interaction.targetMember;
    await interaction.deferReply({
      flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
    });
    await userInfo(interaction, member, isEphemeral);
  },
};
