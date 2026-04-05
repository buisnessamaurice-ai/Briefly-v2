function reteriveTranscript() {
  const videoId = new URLSearchParams(window.location.search).get('v');
  const YT_INITIAL_PLAYER_RESPONSE_RE =
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;
  let player = window.ytInitialPlayerResponse;
  if (!player || videoID !== player.videoDetails.videoId) {
    fetch('https://www.youtube.com/watch?v=' + videoId)
      .then(function (response) {
        return response.text();
      })
      .then(function (body) {
        const playerResponse = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);
        if (!playerResponse) {
          console.warn('Unable to parse playerResponse');
          return;
        }
        player = JSON.parse(playerResponse[1]);
        const metadata = {
          title: player.videoDetails.title,
          duration: player.videoDetails.lengthSeconds,
          author: player.videoDetails.author,
          views: player.videoDetails.viewCount,
        };
        // Get the tracks and sort them by priority
        const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
        tracks.sort(compareTracks);

        // Get the transcript
        fetch(tracks[0].baseUrl + '&fmt=json3')
          .then(function (response) {
            return response.json();
          })
          .then(function (transcript) {
            const result = { transcript: transcript, metadata: metadata };

            const parsedTranscript = transcript.events
              // Remove invalid segments
              .filter(function (x) {
                return x.segs;
              })

              // Concatenate into single long string
              .map(function (x) {
                return x.segs
                  .map(function (y) {
                    return y.utf8;
                  })
                  .join(' ');
              })
              .join(' ')

              // Remove invalid characters
              .replace(/[\u200B-\u200D\uFEFF]/g, '')

              // Replace any whitespace with a single space
              .replace(/\s+/g, ' ');

            // Use 'result' here as needed
            console.log('EXTRACTED_TRANSCRIPT', parsedTranscript);
          });
      });
  }
}

function compareTracks(track1, track2) {
  const langCode1 = track1.languageCode;
  const langCode2 = track2.languageCode;

  if (langCode1 === 'en' && langCode2 !== 'en') {
    return -1; // English comes first
  } else if (langCode1 !== 'en' && langCode2 === 'en') {
    return 1; // English comes first
  } else if (track1.kind !== 'asr' && track2.kind === 'asr') {
    return -1; // Non-ASR comes first
  } else if (track1.kind === 'asr' && track2.kind !== 'asr') {
    return 1; // Non-ASR comes first
  }

  return 0; // Preserve order if both have same priority
}
