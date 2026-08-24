import re

with open('App.tsx', 'r') as f:
    content = f.read()

pattern = r'''const App: React\.FC = \(\) => \{
  const isSrcDoc'''

replacement = r'''const App: React.FC = () => {
  // Clear chunk load error flag if the app successfully loaded
  React.useEffect(() => {
    sessionStorage.removeItem("ChunkLoadError");
  }, []);
  const isSrcDoc'''

content = re.sub(pattern, replacement, content)

with open('App.tsx', 'w') as f:
    f.write(content)
print("done")
