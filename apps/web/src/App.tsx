import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Document } from '@ai-document-vault/shared';
import { DocumentUpload } from './components/DocumentUpload';
import { DocumentList } from './components/DocumentList';
import { GroupSidebar } from './components/GroupSidebar';
import { AIGroupSuggestions } from './components/AIGroupSuggestions';
import { SearchAndFilter } from './components/SearchAndFilter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ApiClientError } from './lib/api/client';
import { getDocuments } from './lib/api/client';
import { getGroupDocuments } from './lib/api/groups';
import { searchDocuments } from './lib/api/search';
import type { SearchParams } from './lib/api/search';
import { ThemeToggle } from './components/ThemeToggle';
import { DocumentItemSkeleton } from './components/Skeleton';
import { AuthGuard } from './components/AuthGuard';
import { UserMenu } from './components/UserMenu';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDocuments, setGroupDocuments] = useState<Document[]>([]);
  const [isLoadingGroupDocuments, setIsLoadingGroupDocuments] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [minLoadingTime, setMinLoadingTime] = useState(false);

  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setGroupDocuments([]);
      setSelectedGroupId(null);
      setSearchParams({});
      setLoadError(null);
      setSearchError(null);
      setIsLoadingDocuments(false);
      setIsLoadingGroupDocuments(false);
      setIsSearching(false);
      return;
    }

    async function loadDocuments() {
      try {
        setDocuments([]);
        setGroupDocuments([]);
        setSelectedGroupId(null);
        setSearchParams({});
        setLoadError(null);
        setSearchError(null);
        
        setIsLoadingDocuments(true);
        setMinLoadingTime(true);
        const startTime = Date.now();
        
        const docs = await getDocuments(false) as Document[];
        
        const elapsed = Date.now() - startTime;
        const minDelay = 300;
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        setDocuments(docs);
      } catch (error) {
        const errorMessage = error instanceof ApiClientError
          ? error.message
          : 'Failed to load documents. Please refresh the page.';
        setLoadError(errorMessage);
      } finally {
        setIsLoadingDocuments(false);
        setTimeout(() => setMinLoadingTime(false), 100);
      }
    }

    loadDocuments();
  }, [user?.id]); // Reload when user ID changes

  useEffect(() => {
    let cancelled = false;
    
    async function performSearch() {
      const hasSearchParams = searchParams.query || searchParams.status || searchParams.groupId;
      
      if (!hasSearchParams && !selectedGroupId) {
        if (documents.length === 0) {
          setIsLoadingDocuments(true);
          setMinLoadingTime(true);
          const startTime = Date.now();
          
          try {
            const docs = await getDocuments(false) as Document[];
            
            const elapsed = Date.now() - startTime;
            const minDelay = 300;
            if (elapsed < minDelay) {
              await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
            }
            
            if (!cancelled) {
              setDocuments(docs);
            }
          } finally {
            if (!cancelled) {
              setIsLoadingDocuments(false);
              setTimeout(() => setMinLoadingTime(false), 100);
            }
          }
        }
        return;
      }

      if (!cancelled) {
        setIsSearching(true);
        setSearchError(null);
        setMinLoadingTime(true);
      }
      
      const startTime = Date.now();
      
      try {
        const searchParamsWithGroup = { ...searchParams };
        if (selectedGroupId) {
          searchParamsWithGroup.groupId = selectedGroupId;
        }

        const results = await searchDocuments(searchParamsWithGroup);
        
        const elapsed = Date.now() - startTime;
        const minDelay = 300;
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        if (!cancelled) {
          if (selectedGroupId) {
            setGroupDocuments(results);
          } else {
            setDocuments(results);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const errorMessage = error instanceof ApiClientError
            ? error.message
            : 'Search failed. Please try again.';
          setSearchError(errorMessage);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
          setTimeout(() => setMinLoadingTime(false), 100);
        }
      }
    }

    performSearch();
    
    return () => {
      cancelled = true;
    };
  }, [searchParams, selectedGroupId, documents.length]);

  const handleUploadSuccess = useCallback((document: Document) => {
    setDocuments((prev) => [document, ...prev]);
  }, []);

  const handleDocumentUpdate = useCallback((updatedDocument: Document) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === updatedDocument.id ? updatedDocument : doc))
    );
    setGroupDocuments((prev) =>
      prev.map((doc) => (doc.id === updatedDocument.id ? updatedDocument : doc))
    );
  }, []);

  const handleDocumentDelete = useCallback((documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    setGroupDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  }, []);

  const handleGroupSelect = useCallback(async (groupId: string | null) => {
    setSelectedGroupId(groupId);

    if (groupId) {
      setIsLoadingGroupDocuments(true);
      try {
        const docs = await getGroupDocuments(groupId);
        setGroupDocuments(docs);
      } catch (error) {
        setGroupDocuments([]);
      } finally {
        setIsLoadingGroupDocuments(false);
      }
    } else {
      setGroupDocuments([]);
    }
  }, []);

  const handleGroupChange = useCallback(async () => {
    if (selectedGroupId) {
      setIsLoadingGroupDocuments(true);
      try {
        const docs = await getGroupDocuments(selectedGroupId);
        setGroupDocuments(docs);
      } finally {
        setIsLoadingGroupDocuments(false);
      }
    }
  }, [selectedGroupId]);

  const handleUploadError = useCallback(() => {
    // Error is already displayed in DocumentUpload component
  }, []);

  const displayedDocuments = useMemo(() => {
    return selectedGroupId ? groupDocuments : documents;
  }, [selectedGroupId, groupDocuments, documents]);

  const isLoading = useMemo(() => {
    return selectedGroupId 
      ? (isLoadingGroupDocuments || isSearching || minLoadingTime)
      : (isLoadingDocuments || isSearching || minLoadingTime);
  }, [selectedGroupId, isLoadingGroupDocuments, isSearching, isLoadingDocuments, minLoadingTime]);

  const handleGroupMembershipChange = useCallback(() => {
    if (selectedGroupId) {
      handleGroupChange();
    }
  }, [selectedGroupId, handleGroupChange]);

  const handleRemoveFromGroup = useCallback(async (documentId: string) => {
    if (!selectedGroupId) return;

    const { removeDocumentFromGroup } = await import('./lib/api/groups');
    await removeDocumentFromGroup(selectedGroupId, documentId);
    handleGroupChange();
  }, [selectedGroupId, handleGroupChange]);

  const handleSuggestionAccepted = useCallback(() => {
    setSidebarRefreshTrigger((prev) => prev + 1);
    handleGroupChange();
  }, [handleGroupChange]);

  const handleSearchChange = useCallback((params: SearchParams) => {
    setSearchParams(params);
  }, []);

  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <GroupSidebar
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleGroupSelect}
          onGroupChange={handleGroupChange}
          refreshTrigger={sidebarRefreshTrigger}
        />

        <div className="flex flex-col min-h-screen transition-all duration-300 sidebar-content">
          <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-700/60 py-8 px-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2 tracking-tight">AI Document Vault</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 font-light">
                  Upload documents for AI processing and analysis
                </p>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950">
            <div className="max-w-6xl mx-auto py-10 px-8 flex flex-col gap-10">
            <section>
              <DocumentUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </section>

            {!selectedGroupId && (
              <section>
                <AIGroupSuggestions
                  onSuggestionAccepted={handleSuggestionAccepted}
                />
              </section>
            )}

            <section>
              <SearchAndFilter
                onSearchChange={handleSearchChange}
                currentGroupId={selectedGroupId}
              />
              {searchError && (
                <ErrorDisplay
                  error={searchError}
                  title="Search Error"
                  onDismiss={() => setSearchError(null)}
                  onRetry={() => {
                    setSearchError(null);
                    setSearchParams((prev) => ({ ...prev }));
                  }}
                  className="mt-4"
                />
              )}
            </section>

            <section>
              {loadError && !isLoading && (
                <ErrorDisplay
                  error={loadError}
                  title="Failed to Load Documents"
                  onRetry={() => {
                    setLoadError(null);
                    const loadDocs = async () => {
                      try {
                        setIsLoadingDocuments(true);
                        setMinLoadingTime(true);
                        const startTime = Date.now();
                        
                        const docs = await getDocuments(false) as Document[];
                        
                        const elapsed = Date.now() - startTime;
                        const minDelay = 300;
                        if (elapsed < minDelay) {
                          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
                        }
                        
                        setDocuments(docs);
                      } catch (error) {
                        const errorMessage = error instanceof ApiClientError
                          ? error.message
                          : 'Failed to load documents. Please refresh the page.';
                        setLoadError(errorMessage);
                      } finally {
                        setIsLoadingDocuments(false);
                        setTimeout(() => setMinLoadingTime(false), 100);
                      }
                    };
                    loadDocs();
                  }}
                  className="mb-6"
                />
              )}
              {isLoading ? (
                <div className="w-full max-w-4xl mx-auto">
                  <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />
                  </div>
                  <div className="flex flex-col gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <DocumentItemSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : (
                <DocumentList 
                  documents={displayedDocuments} 
                  onDocumentUpdate={handleDocumentUpdate}
                  onDocumentDelete={handleDocumentDelete}
                  onGroupsChange={handleGroupMembershipChange}
                  currentGroupId={selectedGroupId}
                  onRemoveFromGroup={handleRemoveFromGroup}
                />
              )}
            </section>
            </div>
          </main>
        </div>
      </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}

export default App;
