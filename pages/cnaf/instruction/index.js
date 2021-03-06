import {useCallback, useEffect, useState, useReducer} from 'react'
import Head from 'next/head'
import { push } from "@socialgouv/matomo-next"
import Layout from '../../../components/layout'
import Mailer from '../../../components/mailer'
import styles from '../../../styles/Home.module.css'


function init() {
  return []
}

function reducer(state, action) {
  switch (action.type) {
    case 'append':
      push(['trackEvent', 'Test - CNAF - Instruction', JSON.stringify(action.item)])
      return [action.item, ...state]
    case 'reset':
      return init()
    default:
      throw new Error()
  }
}

export default function Home() {
  const defaultColor = 'white'
  const [color, setColor] = useState(defaultColor)
  const [file, setFile] = useState(null)
  const [total, setTotal] = useState('?')
  const [countWithEmail, setCountWithEmail] = useState('?')
  const [countWithUsableEmail, setCountWithUsableEmail] = useState('?')
  const [countWithTelephone, setCountWithTelephone] = useState('?')
  const [countWithUsableTelephone, setCountWithUsableTelephone] = useState('?')


  const [runs, dispatchRuns] = useReducer(reducer, [], init)

  const dragHandler = color => useCallback((event) => {
    setColor(color)
    event.preventDefault() // Prevent file from being open on drop
  })

  const fileHandler = (file) => {
    var reader = new FileReader()
    reader.onload = function(event) {
      const parser = new DOMParser()
      const dom = parser.parseFromString(event.target.result, "application/xml")

      const items = new Array(...dom.getElementsByTagName('InfoDemandeRSA'))
      const withEmail = items.filter(i => i.getElementsByTagName('ADRELEC').length)
      const withUsableEmail = items.filter(i => {
        const ok = i.getElementsByTagName('AUTORUTIADRELEC')[0]
        return i.getElementsByTagName('ADRELEC').length && ok && ok.innerHTML == "A"
      })
      const withTelephone = items.filter(i => i.getElementsByTagName('NUMTEL').length)
      const withUsableTelephone = items.filter(i => {
        const ok = i.getElementsByTagName('AUTORUTITEL')[0]
        return i.getElementsByTagName('ADRELEC').length && ok && ok.innerHTML == "A"
      })

      dispatchRuns({
        type: 'append',
        item: {
          timetamp: (new Date()).toISOString().slice(0,19),
          filename: file.name,
          error: dom.activeElement.nodeName == "parsererror",
          total: items.length,
          withEmail: withEmail.length,
          withAutorisation_mail: withUsableEmail.length,
          withTelephone: withTelephone.length,  
          withAutorisation_tel: withUsableTelephone.length
        }
      })
    }
    reader.readAsText(file)
  }

  const dropHandler = useCallback((event) => {
    event.preventDefault()
    setColor(defaultColor)
    for (var i = 0; i<event.dataTransfer.files.length; i++) {
      fileHandler(event.dataTransfer.files[i])
    }
  })

  const selectHandler = useCallback((event) => {
    for (var i = 0; i<event.target.files.length; i++) {
      fileHandler(event.target.files[i])
    }
    event.target.value = ''
  })

  const round = (value) => Math.round(value)
  return (
    <Layout className={styles.container} style={{backgroundColor:color}} onDragOver={dragHandler('#0070f3')} onDragLeave={dragHandler(defaultColor)} onDrop={dropHandler}>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Lecteur de fichier CNAF
        </h1>

        <p className={styles.description}>
          Glissez et déposez le fichier CNAF à analyser ou sélectionnez le.<br/>
          <input type="file" onChange={selectHandler} multiple/>
        </p>

        <p className={styles.description}>
          Les opérations sont toutes réalisées sur votre ordinateur.<br/>
          Aucune donnée personnelle n'est transférée.
        </p>

        <p className={styles.description}>
          <a href="#pourquoi">Pourquoi un tel lecteur&nbsp;?</a>
        </p>

        { runs && runs.length > 0 && (<>
          <h2 className={styles.subtitle}>
            Historique
          </h2>

          <table>
            <tbody>
              <tr>
                <th>Date</th>
                <th>Fichier</th>
                <th>Dossiers</th>
                <th>avec email</th>
                <th>et autorisation_mail</th>
                <th>avec telephone</th> 
                <th>et autorisation_telephone</th>                
                <th>Erreur</th>
              </tr>
              {runs.map(r => (<tr key={`${r.timetamp}-${r.filename}` }>
                <td>{r.timetamp}</td>
                <td>{r.filename}</td>
                <td className={styles.numeric}>{r.total}</td>
                <td className={styles.numeric}>{r.withEmail} ({round(r.withEmail/r.total*100)}%)</td>
                <td className={styles.numeric}>{r.withAutorisation_mail} ({round(r.withAutorisation_mail/r.total*100)}%)</td>
                <td className={styles.numeric}>{r.withTelephone} ({round(r.withTelephone/r.total*100)}%)</td>
                <td className={styles.numeric}>{r.withAutorisation_tel} ({round(r.withAutorisation_tel/r.total*100)}%)</td>                
                <td>{r.error ? 'Oui' : 'Non'}</td>
              </tr>
            ))}
            </tbody>
          </table>

          <button onClick={() => dispatchRuns({type: 'reset'})}>Vider l'historique</button>
        </>)}

        <p className={styles.description}>
          Un problème, une question ? Contactez-nous à <Mailer subject="Flux instruction CNAF">data.insertion@beta.gouv.fr</Mailer>
        </p>

        <h2 id="pourquoi" className={styles.subtitle}>
          Pourquoi un lecteur de fichier CNAF&nbsp;?
        </h2>

        <p className={styles.text}>
          Tous les départements n'ont pas les outils pour analyser les fichiers envoyés par la CNAF. Cela peut ralentir et compliquer nos échanges.
        </p>
        <p className={styles.text}>
          Avec cet outil, nous souhaitons permettre aux personnes qui ont accès à ces fichiers d'en extraire des statistiques générales sans avoir à mettre les mains dans le camboui elles-même.
        </p>
        <p className={styles.text}>
          Aujourd'hui, nous cherchons à comprendre pourquoi pour la CNAF 90% des dossiers présents dans les fichiers quotidiens d'instructions contiennent des emails alors que ce taux est de 30% à 50% pour certains départements.
        </p>

      </main>
    </Layout>
  )
}
