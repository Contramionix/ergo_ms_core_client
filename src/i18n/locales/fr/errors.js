export default {
  boot: {
    badge: 'Erreur de démarrage',
    title: "Échec du chargement de l'application",
    failed: "Actualisez la page ou vérifiez que l'API est en cours d'exécution.",
    hint: "Si l'erreur persiste, assurez-vous que le serveur API est disponible et réessayez.",
    failedLog: 'Échec du démarrage du client :',
  },
  stale: {
    badge: 'Version obsolète',
    title: 'Cette page est obsolète après une mise à jour',
    failed: "Une ancienne version de l'interface est encore chargée. Actualisez la page pour obtenir le nouveau client.",
    hint: "Si le message revient, fermez les onglets supplémentaires de l'application et rouvrez le site.",
    failedLog: 'Client obsolète après déploiement :',
  },
  api: {
    generic: "Une erreur s'est produite",
    tryLater: "Une erreur s'est produite. Veuillez réessayer plus tard.",
    network: 'Impossible de joindre le serveur',
    forbidden: 'Permissions insuffisantes',
    notFound: 'Ressource introuvable',
    validation: 'Veuillez vérifier les champs du formulaire',
    server: 'Erreur serveur',
    tooManyRequests: 'Trop de requêtes. Veuillez patienter un moment et réessayer.',
    payloadTooLarge: 'Le fichier est trop volumineux',
  },
  page: {
    notFound: 'Page introuvable',
    notFoundDescription: "La page demandée n'existe pas ou a été supprimée.",
    goHome: "Retour à l'accueil",
  },
  maintenance: {
    title: 'Maintenance',
    description: 'Le système est temporairement indisponible. Veuillez réessayer plus tard.',
  },
}
