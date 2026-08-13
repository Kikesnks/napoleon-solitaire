import type { Lang } from "../i18n/strings";
import { STRINGS } from "../i18n/strings";

interface Props {
  lang: Lang;
  onClose(): void;
}

/**
 * Política de privacidad **dentro del juego**, no como enlace externo.
 *
 * Dos motivos: en los portales (CrazyGames y compañía) los enlaces que sacan
 * al jugador fuera están mal vistos o directamente prohibidos, y además el
 * juego empaquetado con Capacitor no siempre tendrá conexión. El mismo texto
 * vive también en `public/privacidad.html` para la web propia y para poder
 * enlazarlo desde las fichas de las tiendas.
 *
 * La promesa se formula SIEMPRE referida al juego, nunca a la página que lo
 * aloja — principio rector nº 3 del plan de monetización.
 */
export function PrivacyPolicy({ lang, onClose }: Props) {
  const t = STRINGS[lang];
  return (
    <div
      className="overlay privacy"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
    >
      <div className="overlay__panel privacy__panel">
        <header className="privacy__header">
          <h2 id="privacy-title" className="privacy__title">
            🔒 {t.privacyTitle}
          </h2>
        </header>

        <div className="privacy__body">
          {lang === "es" && <PolicyES />}
          {lang === "en" && <PolicyEN />}
          {lang === "fr" && <PolicyFR />}
        </div>

        <footer className="privacy__footer">
          <button type="button" className="hud__btn hud__btn--primary" onClick={onClose}>
            {t.close}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PolicyES() {
  return (
    <>
      <p className="privacy__lead">
        <strong>Este juego no recopila ninguna información sobre ti.</strong> No hay cuentas ni
        registro. No pedimos tu correo. No te seguimos por internet, no creamos perfiles y no
        vendemos ni cedemos datos a nadie.
      </p>

      <h3>Qué se guarda</h3>
      <p>
        Sólo lo imprescindible para que el juego funcione, y <strong>se queda en tu dispositivo</strong>:
      </p>
      <ul>
        <li>El idioma que elegiste.</li>
        <li>La dificultad que elegiste (2 o 4 palos).</li>
        <li>Si ya viste las reglas, para no repetírtelas.</li>
        <li>Tus mejores partidas, cuando el ranking funciona en local.</li>
      </ul>
      <p>Puedes borrarlo todo vaciando los datos del sitio en tu navegador.</p>

      <h3>Cookies</h3>
      <p>Ninguna. El juego no instala cookies, ni propias ni de terceros.</p>

      <h3>El ranking</h3>
      <p>
        Si envías una puntuación al ranking global, se guarda <em>el nombre o apodo que tú
        escribas</em> junto a la puntuación y la fecha. Es voluntario: puedes jugar sin enviar
        nada y poner el apodo que quieras. No se guarda ningún otro dato.
      </p>

      <h3>Si juegas en un portal de juegos</h3>
      <p>
        Cuando el juego se juega dentro de un portal, <strong>lo que rodea al juego es de ese
        portal</strong>: sus anuncios y sus cookies se rigen por su propia política, que no
        controlamos. Nuestro compromiso se refiere al juego en sí.
      </p>

      <h3>Cambios</h3>
      <p>
        Si algún día el juego incorpora publicidad, será con anuncios{" "}
        <strong>no personalizados</strong> y se anunciará aquí antes.
      </p>
    </>
  );
}

function PolicyEN() {
  return (
    <>
      <p className="privacy__lead">
        <strong>This game collects no information about you.</strong> No accounts, no sign-up.
        We never ask for your email. We do not track you across the internet, we build no
        profiles, and we sell or share data with nobody.
      </p>

      <h3>What is stored</h3>
      <p>
        Only what the game needs in order to work, and <strong>it stays on your device</strong>:
      </p>
      <ul>
        <li>The language you chose.</li>
        <li>The difficulty you chose (2 or 4 suits).</li>
        <li>Whether you have already seen the rules, so we don't repeat them.</li>
        <li>Your best games, when the leaderboard runs locally.</li>
      </ul>
      <p>Clearing the site data in your browser removes all of it.</p>

      <h3>Cookies</h3>
      <p>None. The game sets no cookies, first-party or third-party.</p>

      <h3>The leaderboard</h3>
      <p>
        If you submit a score to the global leaderboard, the nickname <em>you type</em> is stored
        along with the score and the date. It is optional: you can play without submitting
        anything, and any nickname will do. Nothing else is stored.
      </p>

      <h3>If you play on a game portal</h3>
      <p>
        When the game runs inside a portal, <strong>everything around the game belongs to that
        portal</strong>: their ads and cookies follow their own policy, which we do not control.
        Our commitment covers the game itself.
      </p>

      <h3>Changes</h3>
      <p>
        If the game ever shows ads, they will be <strong>non-personalised</strong>, and it will be
        announced here first.
      </p>
    </>
  );
}

function PolicyFR() {
  return (
    <>
      <p className="privacy__lead">
        <strong>Ce jeu ne collecte aucune information sur vous.</strong> Ni compte, ni
        inscription. Nous ne demandons pas votre adresse e-mail. Nous ne vous suivons pas sur
        Internet, nous ne créons aucun profil et nous ne vendons ni ne cédons de données à
        personne.
      </p>

      <h3>Ce qui est enregistré</h3>
      <p>
        Uniquement ce qui est indispensable au fonctionnement du jeu, et{" "}
        <strong>cela reste sur votre appareil</strong> :
      </p>
      <ul>
        <li>La langue que vous avez choisie.</li>
        <li>La difficulté que vous avez choisie (2 ou 4 couleurs).</li>
        <li>Si vous avez déjà lu les règles, pour ne pas vous les réafficher.</li>
        <li>Vos meilleures parties, lorsque le classement fonctionne en local.</li>
      </ul>
      <p>Vous pouvez tout effacer en supprimant les données du site dans votre navigateur.</p>

      <h3>Cookies</h3>
      <p>Aucun. Le jeu ne dépose aucun cookie, ni interne ni tiers.</p>

      <h3>Le classement</h3>
      <p>
        Si vous envoyez un score au classement mondial, le pseudonyme <em>que vous saisissez</em>{" "}
        est enregistré avec le score et la date. C'est facultatif : vous pouvez jouer sans rien
        envoyer, et choisir le pseudonyme que vous voulez. Aucune autre donnée n'est conservée.
      </p>

      <h3>Si vous jouez sur un portail de jeux</h3>
      <p>
        Lorsque le jeu tourne à l'intérieur d'un portail, <strong>tout ce qui entoure le jeu
        appartient à ce portail</strong> : ses publicités et ses cookies relèvent de sa propre
        politique, que nous ne contrôlons pas. Notre engagement porte sur le jeu lui-même.
      </p>

      <h3>Évolutions</h3>
      <p>
        Si le jeu affiche un jour de la publicité, elle sera{" "}
        <strong>non personnalisée</strong>, et cela sera annoncé ici au préalable.
      </p>
    </>
  );
}
