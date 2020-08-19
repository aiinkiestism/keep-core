package diagnostics

import (
	"encoding/json"

	"github.com/ipfs/go-log"
	"github.com/keep-network/keep-common/pkg/diagnostics"
	"github.com/keep-network/keep-core/pkg/net"
	"github.com/keep-network/keep-core/pkg/net/key"
)

var logger = log.Logger("keep-diagnostics")

// Initialize set up the diagnostics registry and enables diagnostics server.
func Initialize(
	port int,
) (*diagnostics.DiagnosticsRegistry, bool) {
	if port == 0 {
		return nil, false
	}

	registry := diagnostics.NewRegistry()

	registry.EnableServer(port)

	return registry, true
}

func RegisterConnectedPeersSource(registry *diagnostics.DiagnosticsRegistry, netProvider net.Provider) {

	registry.RegisterSource("connected_peers", func() string {
		connectedPeers := netProvider.ConnectionManager().ConnectedPeers()

		peersList := make([]map[string]interface{}, len(connectedPeers))
		for i := 0; i < len(connectedPeers); i++ {
			peerPublicKey, err := netProvider.ConnectionManager().GetPeerPublicKey(connectedPeers[i])
			if err != nil {
				logger.Error("Error on getting peer public key: [%v]", err)
				continue
			}

			peersList[i] = map[string]interface{}{
				"PeerId":        connectedPeers[i],
				"PeerPublicKey": key.NetworkPubKeyToEthAddress(peerPublicKey),
			}
		}

		bytes, err := json.Marshal(peersList)
		if err != nil {
			logger.Error("Error on serializing peers list to JSON: [%v]", err)
			return ""
		}

		return string(bytes)
	})
}