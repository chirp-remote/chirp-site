# The community page, kept for later

`/community/` and `/pt/community/` were on usechirp.app from 2026-11-07 to
2026-11-22. They invited people into Chirp's GitHub Discussions and promised
active curation, moderation and a roadmap shaped by reactions. Nobody was
using Chirp yet and the Discussions had no topic, so the page described a
community that did not exist. It came off the site, the way `/conduct/` did on
2026-11-07, and comes back when people use Chirp and start asking in the
Discussions.

## Bringing it back

The page as it was is in commit `8601635`: `site/community/index.html`, the
`comm*` and `discussions` strings and the `community` entry of `META` in
`site/assets/site.js`, the `.channel-*` rules in `site/assets/site.css`, the
`/pt/community/` block in `scripts/build-site.sh`, both paths in
`scripts/check-live-site.sh`, and the footer link on every page. Restore those,
then replace the text with the copy below, which fixes the wording of the
version that was online.

Before it goes up again, check that what it promises is true by then: who
moderates, how often, and whether reactions really feed the roadmap.

## Copy

Headings and labels are in sentence case, as on the rest of the site.

### English

- **Kicker:** Community
- **Title:** Chirp community
- **Lede:** A place to talk about using Chirp, how it is built, and where it
  goes next. We value privacy, security and respectful collaboration.

**1. How to take part**

Chirp is built on trust and mutual respect. To keep discussions useful:

- **Constructive feedback:** we welcome well-thought-out ideas, bug reports
  with steps to reproduce them, accessibility suggestions and performance
  improvements.
- **Respect:** everyone is expected to treat others with courtesy.
  Disrespect and trolling are moderated straight away.
- **Security reports in private:** never post a possible vulnerability in a
  public discussion. Send it to `security@fabrintek.com.br`, under our
  coordinated disclosure process.

**2. Where to talk**

Join the conversation in Chirp's GitHub Discussions:

| Card | Text | Button | Category |
|---|---|---|---|
| Ideas and feature proposals | Suggest improvements, protocol ideas, interface changes and support for more platforms. | Propose an idea → | `ideas` |
| Show and tell | Share how you use Chirp: helping family, remote IT, accessibility or your own relay. | Share a use case → | `show-and-tell` |
| Questions and help | Ask maintainers and other users about NAT traversal, firewalls and builds. | Ask a question → | `q-a` |
| Design and architecture | In-depth talk about memory-only relays, WebRTC signalling, the Fyne interface and the security model. | Join the discussion → | `design` |

**3. Moderation**

To keep discussions focused:

- **Scams and spam:** remote help tools are a favourite of scammers.
  Comments that promote scams, unverified tools or spam are removed, and their
  accounts restricted.
- **Reactions count:** maintainers regularly review the topics with the most
  positive reactions (👍, 🚀, ❤️) and bring them into the roadmap.
- **No tracking:** this page is static HTML, with no tracking scripts and no
  cookies.

**Meta description:** A place to talk about using Chirp, how it is built, and
where it goes next.

### Português (Brasil)

- **Kicker:** Comunidade
- **Título:** Comunidade do Chirp
- **Lede:** Um lugar para conversar sobre o uso do Chirp, como ele é feito e
  para onde ele vai. Valorizamos privacidade, segurança e colaboração
  respeitosa.

**1. Como participar**

O Chirp se apoia na confiança e no respeito mútuo. Para que as conversas sejam
úteis:

- **Feedback construtivo:** são bem-vindas ideias bem pensadas, relatos de
  bugs com os passos para reproduzi-los, sugestões de acessibilidade e
  melhorias de desempenho.
- **Respeito:** esperamos que todos tratem os outros com cortesia.
  Desrespeito e provocações são moderados na hora.
- **Vulnerabilidades em particular:** nunca publique uma possível
  vulnerabilidade numa discussão aberta. Envie para
  `security@fabrintek.com.br`, conforme o nosso processo de divulgação
  coordenada.

**2. Onde conversar**

Participe das conversas no GitHub Discussions do Chirp:

| Cartão | Texto | Botão |
|---|---|---|
| Ideias e sugestões de recursos | Sugira melhorias, ideias de protocolo, mudanças na interface e suporte a mais plataformas. | Propor uma ideia → |
| Mostre como você usa | Conte como você usa o Chirp: ajudando a família, em TI remota, em acessibilidade ou com o seu próprio relay. | Contar como uso → |
| Perguntas e ajuda | Tire dúvidas com mantenedores e outros usuários sobre travessia de NAT, firewalls e compilação. | Fazer uma pergunta → |
| Design e arquitetura | Conversas aprofundadas sobre relays só em memória, sinalização WebRTC, a interface em Fyne e o modelo de segurança. | Entrar na discussão → |

**3. Moderação**

Para manter as conversas no foco:

- **Golpes e spam:** ferramentas de ajuda remota são as preferidas de
  golpistas. Comentários que promovem golpes, ferramentas não verificadas ou
  spam são removidos, e as contas, restringidas.
- **Reações contam:** os mantenedores revisam com frequência os tópicos com
  mais reações positivas (👍, 🚀, ❤️) e os levam para o roadmap.
- **Sem rastreamento:** esta página é HTML estático, sem scripts de
  rastreamento e sem cookies.

**Meta description:** Um lugar para conversar sobre o uso do Chirp, como ele é
feito e para onde ele vai.
