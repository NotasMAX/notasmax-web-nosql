import * as nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; // URL do seu frontend
export const ADMIN_CONTACT_EMAIL = process.env.ADMIN_CONTACT_EMAIL || 'admin@NotasMax.com'; // E-mail de contato do administrador

// Criar transporter apenas se houver credenciais
let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
}

/**
 * Envia o email com o link de redefinição de senha.
 * @param toEmail O email do destinatário.
 * @param token O token de redefinição não hasheado.
 */
export const sendPasswordResetEmail = async (toEmail, token, transport = transporter) => {
    // Se não houver credenciais de email configuradas, apenas registrar no console (desenvolvimento)
    if (!transport) {
        console.log(`[DESENVOLVIMENTO] Email de redefinição de senha para ${toEmail}`);
        console.log(`Token de redefinição: ${token}`);
        console.log(`Link: ${FRONTEND_URL}/reset?token=${token}`);
        return;
    }

    const resetLink = `${FRONTEND_URL}/reset?token=${token}`;
    const supportEmail = ADMIN_CONTACT_EMAIL;

    await transport.sendMail({
        from: `"NotasMax" <${EMAIL_USER}>`,
        to: toEmail,
        subject: "Redefinição de Senha Solicitada",
        html:
            `
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
            <head>
                <title></title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]>
                        <xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail /></w:WordDocument>
                            <o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG /></o:OfficeDocumentSettings></xml>
                        <![endif]--><!--[if !mso]><!-->
                        <link href="https://fonts.googleapis.com/css?family=Roboto+Slab" rel="stylesheet" type="text/css">
                            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;200;300;400;500;600;700;800;900" rel="stylesheet" type="text/css">
                                <link href="https://fonts.googleapis.com/css2?family=Lato:wght@100;200;300;400;500;600;700;800;900" rel="stylesheet" type="text/css"><!--<![endif]-->
                                    <style>
                                        * {
                                            box - sizing: border-box;
		}

                                        body {
                                            margin: 0;
                                        padding: 0;
		}

                                        a[x-apple-data-detectors] {
                                            color: inherit !important;
                                        text-decoration: inherit !important;
		}

                                        #MessageViewBody a {
                                            color: inherit;
                                        text-decoration: none;
		}

                                        p {
                                            line - height: inherit
		}

                                        .desktop_hide,
                                        .desktop_hide table {
                                            mso - hide: all;
                                        display: none;
                                        max-height: 0px;
                                        overflow: hidden;
		}

                                        .image_block img+div {
                                            display: none;
		}

                                        sup,
                                        sub {
                                            font - size: 75%;
                                        line-height: 0;
		}

                                        @media (max-width:670px) {
			.desktop_hide table.icons-inner {
                                            display: inline-block !important;
			}

                                        .icons-inner {
                                            text - align: center;
			}

                                        .icons-inner td {
                                            margin: 0 auto;
			}

                                        .mobile_hide {
                                            display: none;
			}

                                        .row-content {
                                            width: 100% !important;
			}

                                        .stack .column {
                                            width: 100%;
                                        display: block;
			}

                                        .mobile_hide {
                                            min - height: 0;
                                        max-height: 0;
                                        max-width: 0;
                                        overflow: hidden;
                                        font-size: 0px;
			}

                                        .desktop_hide,
                                        .desktop_hide table {
                                            display: table !important;
                                        max-height: none !important;
			}
		}
                                    </style><!--[if mso ]><style>sup, sub {font - size: 100% !important; } sup {mso - text - raise:10% } sub {mso - text - raise:-10% }</style> <![endif]-->
                                </head>

                                <body class="body" style="background-color: #85a4cd; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
                                    <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #85a4cd;">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f9f9f9;">
                                                        <tbody>
                                                            <tr>
                                                                <td>
                                                                    <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 650px; margin: 0 auto;" width="650">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td class="column column-1" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
                                                                                    <table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                        <tr>
                                                                                            <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
                                                                                                <div class="alignment" align="right">
                                                                                                    <div style="max-width: 65px;"><img src="https://ec235cd76d.imgdist.com/pub/bfra/vvmttxno/4l7/808/5h7/logo%203d.png" style="display: block; height: auto; border: 0; width: 100%;" width="65" alt="Colégio Max Beny Macena" title="Colégio Max Beny Macena" height="auto"></div>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                </td>
                                                                                <td class="column column-2" width="66.66666666666667%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
                                                                                    <table class="heading_block block-1" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                        <tr>
                                                                                            <td class="pad">
                                                                                                <h1 style="margin: 0; color: #243a51; direction: ltr; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif; font-size: 38px; font-weight: 700; letter-spacing: 4px; line-height: 1.5; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 57px;"><span class="tinyMce-placeholder" style="word-break: break-word;">&nbsp; NOTASMAX</span></h1>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #85a3cc;">
                                                        <tbody>
                                                            <tr>
                                                                <td>
                                                                    <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px; margin: 0 auto;" width="650">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
                                                                                    <div class="spacer_block block-1" style="height:60px;line-height:60px;font-size:1px;">&#8202;</div>
                                                                                    <table class="heading_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                        <tr>
                                                                                            <td class="pad" style="padding-bottom:10px;text-align:center;width:100%;">
                                                                                                <h1 style="margin: 0; color: #ffffff; direction: ltr; font-family: 'Roboto Slab', Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 30px; font-weight: normal; letter-spacing: 2px; line-height: 1.2; text-align: center; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 36px;"><strong>Esqueceu sua senha?</strong></h1>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                    <table class="image_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                        <tr>
                                                                                            <td class="pad" style="width:100%;">
                                                                                                <div class="alignment" align="center">
                                                                                                    <div style="max-width: 500px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/3856/GIF_password.gif" style="display: block; height: auto; border: 0; width: 100%;" width="500" alt="Wrong Password Animation" title="Wrong Password Animation" height="auto"></div>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                    <div class="spacer_block block-4" style="height:20px;line-height:20px;font-size:1px;">&#8202;</div>
                                                                                    <table class="paragraph_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                        <tr>
                                                                                            <td class="pad" style="padding-bottom:5px;padding-left:10px;padding-right:10px;padding-top:5px;">
                                                                                                <div style="color:#3f4d75;font-family:Roboto Slab, Arial, Helvetica Neue, Helvetica, sans-serif;font-size:20px;line-height:1.2;text-align:center;mso-line-height-alt:24px;">
                                                                                                    <p style="margin: 0; word-break: break-word;"><span style="word-break: break-word;">Não se preocupe!</span></p>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                    <table class="paragraph_block block-6" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                        <tr>
                                                                                            <td class="pad" style="padding-bottom:5px;padding-left:10px;padding-right:10px;padding-top:5px;">
                                                                                                <div style="color:#3f4d75;font-family:Roboto Slab, Arial, Helvetica Neue, Helvetica, sans-serif;font-size:22px;line-height:1.2;text-align:center;mso-line-height-alt:26px;">
                                                                                                    <p style="margin: 0; word-break: break-word;">Vamos criar uma nova senha para você.</p>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                    <div class="spacer_block block-7" style="height:20px;line-height:20px;font-size:1px;">&#8202;</div>
                                                                                    <table class="button_block block-8" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                        <tr>
                                                                                            <td class="pad">
                                                                                                <div class="alignment" align="center"><a href="${resetLink}" target="_blank" style="color:#3f4d75;text-decoration:none;"><!--[if mso]>
                                                                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetLink}" style="height:56px;width:227px;v-text-anchor:middle;" arcsize="17%" fillcolor="#ffffff">
                                                                                                        <v:stroke dashstyle="Solid" weight="2px" color="#3F4D75" />
                                                                                                        <w:anchorlock />
                                                                                                        <v:textbox inset="0px,0px,0px,0px">
                                                                                                            <center dir="false" style="color:#3f4d75;font-family:sans-serif;font-size:18px">
                                                                                                                <![endif]--><span class="button" style="background-color: #ffffff; mso-shading: transparent; border-bottom: 2px solid #3F4D75; border-left: 2px solid #3F4D75; border-radius: 10px; border-right: 2px solid #3F4D75; border-top: 2px solid #3F4D75; color: #3f4d75; display: inline-block; font-family: Roboto Slab, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 18px; font-weight: undefined; mso-border-alt: none; padding-bottom: 10px; padding-top: 10px; padding-left: 25px; padding-right: 25px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 36px;">CRIAR NOVA SENHA</span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                    <div class="spacer_block block-9" style="height:20px;line-height:20px;font-size:1px;">&#8202;</div>
                                                                                    <table class="paragraph_block block-10" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                        <tr>
                                                                                            <td class="pad">
                                                                                                <div style="color:#3f4d75;font-family:Roboto Slab, Arial, Helvetica Neue, Helvetica, sans-serif;font-size:14px;line-height:1.2;text-align:center;mso-line-height-alt:17px;">
                                                                                                    <p style="margin: 0; word-break: break-word;">Se você não solicitou a alteração da sua senha, simplesmente ignore este e-mail.</p>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                    <div class="spacer_block block-11" style="height:30px;line-height:30px;font-size:1px;">&#8202;</div>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #c4d6ec;">
                                                        <tbody>
                                                            <tr>
                                                                <td>
                                                                    <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 650px; margin: 0 auto;" width="650">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 20px; padding-top: 20px; vertical-align: top;">
                                                                                    <table class="paragraph_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                        <tr>
                                                                                            <td class="pad">
                                                                                                <div style="color:#3f4d75;font-family:Roboto Slab, Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;line-height:1.2;text-align:center;mso-line-height-alt:14px;">
                                                                                                    <p style="margin: 0; word-break: break-word;">Este link expirará em uma hora. Se você continuar com problemas,</p>
                                                                                                    <p style="margin: 0; word-break: break-word;">entre em contato conosco pelo endereço <a href="mailto:${supportEmail}" target="_blank" style="text-decoration: underline; color: #ffffff;" rel="noopener">${supportEmail}</a>&nbsp;</p>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <table class="row row-4" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
                                                        <tbody>
                                                            <tr>
                                                                <td>
                                                                    <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; background-color: #ffffff; width: 650px; margin: 0 auto;" width="650">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
                                                                                    <table class="icons_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; text-align: center; line-height: 0;">
                                                                                        <tr>
                                                                                            <td class="pad" style="vertical-align: middle; color: #1e0e4b; font-family: 'Inter', sans-serif; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;"><!--[if vml]><table align="center" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
                                                                                                <!--[if !vml]><!-->
                                                                                                <table class="icons-inner" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block; padding-left: 0px; padding-right: 0px;" cellpadding="0" cellspacing="0" role="presentation"><!--<![endif]-->
                                                                                                    <tr>
                                                                                                        <td style="vertical-align: middle; text-align: center; padding-top: 5px; padding-bottom: 5px; padding-left: 5px; padding-right: 6px;"><a href="https://designedwithbeefree.com/" target="_blank" title="Designed with Beefree" style="text-decoration: none;"><img class="icon" alt="Beefree Logo" src="https://d1oco4z2z1fhwp.cloudfront.net/assets/Beefree-logo.png" height="auto" width="34" align="center" style="display: block; height: auto; margin: 0 auto; border: 0;"></a></td>
                                                                                                        <td style="font-family: 'Inter', sans-serif; font-size: 15px; font-weight: undefined; color: #1e0e4b; vertical-align: middle; letter-spacing: normal; text-align: center; line-height: normal;"><a href="https://designedwithbeefree.com/" target="_blank" title="Designed with Beefree" style="color: #1e0e4b; text-decoration: none;">Designed with Beefree</a></td>
                                                                                                    </tr>
                                                                                                </table>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </table>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table><!-- End -->
                                </body>
                            </html>
            `
        ,
    });
};

/**
 * Envia um email de redefinicao com token para uso exclusivo no aplicativo mobile.
 * @param toEmail O email do destinatario.
 * @param token O token de redefinicao nao hasheado.
 */
export const sendPasswordResetEmailMobile = async (toEmail, token, transport = transporter) => {
    if (!transport) {
        console.log(`[DESENVOLVIMENTO] Email de redefinicao mobile para ${toEmail}`);
        console.log(`Codigo de redefinicao (mobile): ${token}`);
        return;
    }

    const supportEmail = ADMIN_CONTACT_EMAIL;

    await transport.sendMail({
        from: `"NotasMax" <${EMAIL_USER}>`,
        to: toEmail,
        subject: "Redefinição de Senha Solicitada (Mobile)",
        html: `
        <html lang="pt-BR">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Recuperação de senha - NotasMax Mobile</title>
            </head>
            <body style="background-color:#85a4cd;margin:0;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#85a4cd;">
                    <tr>
                        <td>
                            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9f9f9;">
                                <tr>
                                    <td>
                                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000000;width:650px;margin:0 auto;" width="650">
                                            <tr>
                                                <td width="33.33%" style="padding:5px 0;vertical-align:top;">
                                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                        <tr>
                                                            <td style="width:100%;padding:0;">
                                                                <div align="right" style="padding-right:10px;">
                                                                    <img src="https://ec235cd76d.imgdist.com/pub/bfra/vvmttxno/4l7/808/5h7/logo%203d.png" width="65" alt="Colégio Max Beny Macena" style="display:block;height:auto;border:0;width:100%;max-width:65px;" />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td width="66.67%" style="padding:5px 0;vertical-align:top;">
                                                    <h1 style="margin:0;color:#243a51;font-family:'Lato',Tahoma,Verdana,Segoe,sans-serif;font-size:38px;font-weight:700;letter-spacing:4px;line-height:1.5;text-align:left;">&nbsp; NOTASMAX</h1>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#85a3cc;">
                                <tr>
                                    <td>
                                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000000;width:650px;margin:0 auto;" width="650">
                                            <tr>
                                                <td style="padding:5px 0;vertical-align:top;">
                                                    <div style="height:40px;line-height:40px;font-size:1px;">&#8202;</div>
                                                    <h1 style="margin:0 0 10px;color:#ffffff;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:30px;letter-spacing:2px;line-height:1.2;text-align:center;"><strong>Esqueceu sua senha?</strong></h1>
                                                    <div align="center" style="width:100%;">
                                                        <img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/3856/GIF_password.gif" width="500" alt="Animação recuperação de senha" style="display:block;height:auto;border:0;width:100%;max-width:500px;" />
                                                    </div>
                                                    <div style="height:20px;line-height:20px;font-size:1px;">&#8202;</div>
                                                    <p style="margin:0;text-align:center;color:#3f4d75;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:20px;line-height:1.2;">Não se preocupe!</p>
                                                    <p style="margin:8px 0 0;text-align:center;color:#3f4d75;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:22px;line-height:1.2;">Use o código abaixo no aplicativo mobile.</p>
                                                    <div style="height:20px;line-height:20px;font-size:1px;">&#8202;</div>

                                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                        <tr>
                                                            <td style="padding:0 24px;">
                                                                <div style="background-color:#ffffff;border:2px solid #3F4D75;border-radius:10px;padding:14px 16px;text-align:center;">
                                                                    <p style="margin:0;color:#3f4d75;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;">CÓDIGO DE RECUPERAÇÃO</p>
                                                                    <p style="margin:8px 0 0;color:#243a51;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:1px;word-break:break-all;">${token}</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <div style="height:20px;line-height:20px;font-size:1px;">&#8202;</div>
                                                    <p style="margin:0;padding:0 24px;text-align:center;color:#3f4d75;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.3;">Este código expira em 1 hora e deve ser usado apenas no aplicativo mobile.</p>
                                                    <p style="margin:10px 0 0;padding:0 24px;text-align:center;color:#3f4d75;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.3;">Se você não solicitou a alteração da senha, ignore este e-mail.</p>
                                                    <div style="height:30px;line-height:30px;font-size:1px;">&#8202;</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#c4d6ec;">
                                <tr>
                                    <td>
                                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000000;width:650px;margin:0 auto;" width="650">
                                            <tr>
                                                <td style="padding:20px 10px;text-align:center;">
                                                    <p style="margin:0;color:#3f4d75;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;">Se continuar com problemas, entre em contato com o suporte:</p>
                                                    <p style="margin:4px 0 0;color:#3f4d75;font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;"><a href="mailto:${supportEmail}" style="text-decoration:underline;color:#ffffff;" rel="noopener">${supportEmail}</a></p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
        `,
    });
};

