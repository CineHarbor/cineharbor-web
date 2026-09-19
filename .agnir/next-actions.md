# cineharbor-web Next Actions

1. Run the product-path branch through complete PR CI, including the new Bangumi and production-browser product-path smokes. Repair real failures without weakening any assertion.
2. After merge, require two complete successful CI runs on one exact final Web main SHA. Update Desktop's pinned Web/SDK revisions only after those final SHA gates pass.
3. Finish remaining API/consumer classification and retire duplicate content implementations without capability loss; document retained control/release API ownership and authentication.
4. Verify production addon/media configuration and real deployment smoke. Complete security, dependency, license, brand and version review across the seven-repository release unit.
5. Complete signed Desktop 1.0.0 RCs and a real old-version → 1.0.0 updater run with retained user data. Only after every hard gate passes, execute the Principal-authorized public release and verify updater/download-site propagation.

Continue autonomously; do not substitute mocked/unit evidence for required runtime, signing or production gates.
