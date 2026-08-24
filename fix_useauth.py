import re

with open('src/hooks/useAuth.tsx', 'r') as f:
    content = f.read()

# Chunk 1
pattern1 = r'''    if \(\!auth\) \{
      setLoading\(false\);
      return;
    \}
    
    let unsubUser: \(\(\) => void\) \| null = null;'''

replacement1 = r'''    if (!auth) {
      setLoading(false);
      return;
    }
    
    let checkedOrgs = new Set<string>();
    let unsubUser: (() => void) | null = null;'''

content = re.sub(pattern1, replacement1, content)

# Chunk 2
pattern2 = r'''            // Perform background checks logic in a single fetch
            if \(currentOrgId && \(userRole !== "admin" \|\| \!currentOrgName\)\) \{
              try \{
                const orgRef = doc\(db, "organizations", currentOrgId\);
                const orgSnap = await getDoc\(orgRef\);
                
                if \(orgSnap.exists\(\)\) \{
                  const orgData = orgSnap.data\(\);
                  
                  // Check owner - only grant admin if org is active and user role isn't pending
                  if \(userRole !== "admin" && orgData.createdBy === currentUser.uid && orgData.status !== "pending" && data.roles\?\.\[currentOrgId\] !== "pending"\) \{
                    userRole = "admin";
                    setRole\(userRole\);
                    updateDoc\(userDocRef, \{ \[`roles\.\$\{currentOrgId\}`\]: "admin" \}\)\.catch\(e => handleFirestoreError\(e, OperationType.WRITE, `users/\$\{currentUser.uid\}`\)\);
                  \}
                  // Check org name
                  if \(\!currentOrgName\) \{
                    const fetchedOrgName = orgData.name;
                    setOrgName\(fetchedOrgName\);
                    setVisitedOrgs\(prev => \(\{ \.\.\.prev, \[currentOrgId\]: fetchedOrgName \}\)\);
                    updateDoc\(
                      userDocRef,
                      \{
                        \[`visitedOrgs\.\$\{currentOrgId\}`\]: fetchedOrgName,
                      \}
                    \)\.catch\(e => handleFirestoreError\(e, OperationType.WRITE, `users/\$\{currentUser.uid\}`\)\);
                  \}
                \}
              \} catch \(e\) \{
                console.error\("Error fetching org data:", e\);
                handleFirestoreError\(e, OperationType.GET, `organizations/\$\{currentOrgId\}`\);
              \}
            \}'''

replacement2 = r'''            // Perform background checks logic in a single fetch
            if (currentOrgId && (userRole !== "admin" || !currentOrgName)) {
              if (!checkedOrgs.has(currentOrgId)) {
                checkedOrgs.add(currentOrgId);
                try {
                  const orgRef = doc(db, "organizations", currentOrgId);
                  const orgSnap = await getDoc(orgRef);
                  
                  if (orgSnap.exists()) {
                    const orgData = orgSnap.data();
                    
                    // Check owner - only grant admin if org is active and user role isn't pending
                    if (userRole !== "admin" && orgData.createdBy === currentUser.uid && orgData.status !== "pending" && data.roles?.[currentOrgId] !== "pending") {
                      userRole = "admin";
                      setRole(userRole);
                      updateDoc(userDocRef, { [`roles.${currentOrgId}`]: "admin" }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}`));
                    }
                    // Check org name
                    if (!currentOrgName) {
                      const fetchedOrgName = orgData.name;
                      setOrgName(fetchedOrgName);
                      setVisitedOrgs(prev => ({ ...prev, [currentOrgId]: fetchedOrgName }));
                      updateDoc(
                        userDocRef,
                        {
                          [`visitedOrgs.${currentOrgId}`]: fetchedOrgName,
                        }
                      ).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}`));
                    }
                  }
                } catch (e) {
                  console.error("Error fetching org data:", e);
                  handleFirestoreError(e, OperationType.GET, `organizations/${currentOrgId}`);
                }
              }
            }'''

content = re.sub(pattern2, replacement2, content)

with open('src/hooks/useAuth.tsx', 'w') as f:
    f.write(content)

print("Replacement done")
