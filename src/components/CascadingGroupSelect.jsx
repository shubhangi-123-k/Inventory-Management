import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomSelectWithArrow from './CustomSelectWithArrow';
import api from '../api/axios';

const CascadingGroupSelect = ({ value, onSelectionComplete, refreshTrigger, onAddGroup, onBeforeRedirect, onViewProduct, editingProductId }) => {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(''); // Level 1 (Main Group)
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(''); // Sub-group (can be Level 2, Level 3, etc.)
  const [childSelections, setChildSelections] = useState([]); // Dynamic downward children if selectedSubgroupId has sub-groups

  // Fetch group tree from backend
  const fetchTree = async () => {
    try {
      const response = await api.get('/admin/groups/tree');
      const responseData = response.data?.data || response.data || [];
      const data = Array.isArray(responseData) ? responseData : (responseData.tree || responseData.groups || []);
      if (Array.isArray(data) && data.length > 0) {
        setTree(data);
        return;
      }
      await fetchFlatGroupsAsTree();
    } catch (error) {
      // Some Admin/Sub-Admin API roles can read the group list even when the
      // dedicated tree endpoint is not available to them. Keep the selectors
      // usable by constructing the same hierarchy from the permitted list.
      try {
        await fetchFlatGroupsAsTree();
      } catch (fallbackError) {
        console.error('Failed to fetch group tree and fallback group list', fallbackError || error);
      }
    }
  };

  const fetchFlatGroupsAsTree = async () => {
    const response = await api.get('/admin/groups');
    const responseData = response.data?.data || response.data || [];
    const groups = Array.isArray(responseData) ? responseData : (responseData.groups || []);
    const nodes = new Map(groups.map(group => [String(group.id), { ...group, children: [] }]));
    const roots = [];
    nodes.forEach(node => {
      const parent = node.parent_id ? nodes.get(String(node.parent_id)) : null;
      if (parent && parent !== node) parent.children.push(node);
      else roots.push(node);
    });
    setTree(roots);
  };

  useEffect(() => {
    fetchTree();
  }, [refreshTrigger]);

  // Helper to find ancestor node path from root down to targetId
  const findNodePath = (nodes, targetId, currentPath = []) => {
    if (!targetId || !nodes) return null;
    for (let node of nodes) {
      if (node.id.toString() === targetId.toString()) {
        return [...currentPath, node];
      }
      if (node.children && node.children.length > 0) {
        const found = findNodePath(node.children, targetId, [...currentPath, node]);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to find a specific node in the tree
  const findNodeById = (nodes, id) => {
    if (!id || !nodes) return null;
    for (let node of nodes) {
      if (node.id.toString() === id.toString()) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Synchronize state when external 'value' prop changes (e.g. on product load/edit)
  useEffect(() => {
    if (tree.length > 0) {
      if (value) {
        const path = findNodePath(tree, value);
        if (path && path.length > 0) {
          setSelectedParentId(path[0].id.toString());
          if (path.length > 1) {
            setSelectedSubgroupId(path[1].id.toString());
            setChildSelections(path.slice(2).map(n => n.id.toString()));
          } else {
            setSelectedSubgroupId('');
            setChildSelections([]);
          }
        }
      } else if (!value) {
        setSelectedParentId('');
        setSelectedSubgroupId('');
        setChildSelections([]);
      }
    }
  }, [value, tree]);

  // 1. Root Groups (Level 1)
  const rootGroups = tree;

  // 2. All Subgroups across the whole system (recursively traversing all depths >= 2)
  const allSystemSubgroups = useMemo(() => {
    const list = [];
    const traverse = (nodes, parentBreadcrumb, depth) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            const nextBreadcrumb = parentBreadcrumb ? `${parentBreadcrumb} > ${node.name}` : node.name;
            list.push({
              id: child.id,
              name: child.name,
              group_code: child.group_code,
              parent_id: child.parent_id,
              depth: depth,
              parentName: node.name,
              breadcrumb: nextBreadcrumb,
              fullDisplay: `${child.name} (Level ${depth} | ${nextBreadcrumb})`,
              rawNode: child
            });
            traverse([child], nextBreadcrumb, depth + 1);
          }
        }
      }
    };
    traverse(tree, '', 2);
    return list;
  }, [tree]);

  // 3. Subgroups available for Dropdown 2:
  // - If parent is selected: all sub-groups under that parent branch across any depth.
  // - If parent is NOT selected: all sub-groups across the entire system.
  const subgroupOptions = useMemo(() => {
    if (selectedParentId) {
      const parentNode = tree.find(n => n.id.toString() === selectedParentId.toString());
      if (!parentNode || !parentNode.children) return [];

      const list = [];
      const traverse = (nodes, breadcrumb, depth) => {
        for (const child of nodes) {
          const nextBreadcrumb = breadcrumb ? `${breadcrumb} > ${child.name}` : child.name;
          list.push({
            id: child.id,
            name: child.name,
            group_code: child.group_code,
            parent_id: child.parent_id,
            depth: depth,
            breadcrumb: breadcrumb || parentNode.name,
            fullDisplay: depth === 2
              ? `${child.name} (Level 2)`
              : `${child.name} (Level ${depth} | ${breadcrumb})`,
            rawNode: child
          });
          if (child.children && child.children.length > 0) {
            traverse(child.children, nextBreadcrumb, depth + 1);
          }
        }
      };
      traverse(parentNode.children, '', 2);
      return list;
    }
    return allSystemSubgroups;
  }, [selectedParentId, tree, allSystemSubgroups]);

  // 4. Dynamic Downwards Prediction:
  // Inspect if the selected sub-group exists. Always render the immediate next child level!
  const dynamicChildLevels = useMemo(() => {
    if (!selectedSubgroupId) return [];
    const baseNode = findNodeById(tree, selectedSubgroupId);
    if (!baseNode) return [];

    const basePath = findNodePath(tree, selectedSubgroupId) || [];
    const baseDepth = basePath.length; // e.g. 2 for Level 2

    let current = baseNode;
    const levels = [];
    let depthIndex = 0;

    while (current) {
      const selectedForLevel = childSelections[depthIndex] || '';
      levels.push({
        levelIndex: depthIndex,
        levelNumber: baseDepth + 1 + depthIndex,
        parentName: current.name,
        parentId: current.id,
        options: current.children || [],
        selectedValue: selectedForLevel
      });

      if (selectedForLevel && current.children && current.children.length > 0) {
        current = current.children.find(c => c.id.toString() === selectedForLevel.toString());
      } else {
        break;
      }
      depthIndex++;
    }

    return levels;
  }, [selectedSubgroupId, childSelections, tree]);

  // Active breadcrumb summary for the user: only includes groups that are actually selected
  const activePathSummary = useMemo(() => {
    const parts = [];

    // 1. Only include Main Group if it is explicitly selected
    if (selectedParentId) {
      const parentNode = tree.find(n => n.id.toString() === selectedParentId.toString());
      if (parentNode) parts.push(parentNode.name);
    }

    // 2. Include Sub-Group if selected
    if (selectedSubgroupId) {
      const subNode = findNodeById(tree, selectedSubgroupId);
      if (subNode) parts.push(subNode.name);
    }

    // 3. Include any deeper child sub-groups
    if (childSelections && childSelections.length > 0) {
      for (const cId of childSelections) {
        if (cId) {
          const cNode = findNodeById(tree, cId);
          if (cNode) parts.push(cNode.name);
        }
      }
    }

    if (parts.length === 0) return null;

    return {
      text: parts.join(' > '),
      level: parts.length
    };
  }, [tree, selectedParentId, selectedSubgroupId, childSelections]);

  // Notify parent of the deepest selected group ID
  const notifyFinalSelection = (parentId, subId, children) => {
    let finalId = null;
    if (children && children.length > 0 && children[children.length - 1]) {
      finalId = children[children.length - 1];
    } else if (subId) {
      finalId = subId;
    } else if (parentId) {
      finalId = parentId;
    }
    onSelectionComplete(finalId);
  };

  // Handler: Change Main Group (Dropdown 1)
  const handleParentChange = (newParentId) => {
    setSelectedParentId(newParentId);

    // If user cleared the Main Group, leave sub-groups as they are and emit updated selection
    if (!newParentId) {
      notifyFinalSelection('', selectedSubgroupId, childSelections);
      return;
    }

    // If a subgroup was already selected, check if it belongs to this new parent branch
    if (selectedSubgroupId) {
      const path = findNodePath(tree, selectedSubgroupId);
      if (!path || path[0].id.toString() !== newParentId.toString()) {
        setSelectedSubgroupId('');
        setChildSelections([]);
        notifyFinalSelection(newParentId, '', []);
        return;
      }
    }
    notifyFinalSelection(newParentId, selectedSubgroupId, childSelections);
  };

  // Handler: Change Sub-Group (Dropdown 2)
  const handleSubgroupChange = (newSubId) => {
    if (!newSubId) {
      setSelectedSubgroupId('');
      setChildSelections([]);
      notifyFinalSelection(selectedParentId, '', []);
      return;
    }

    const path = findNodePath(tree, newSubId);
    if (path && path.length > 0) {
      // Auto-sync parent Main Group (Level 1)
      const rootId = path[0].id.toString();
      setSelectedParentId(rootId);

      if (path.length === 2) {
        setSelectedSubgroupId(path[1].id.toString());
        setChildSelections([]);
        notifyFinalSelection(rootId, path[1].id.toString(), []);
      } else if (path.length > 2) {
        setSelectedSubgroupId(path[1].id.toString());
        const deeper = path.slice(2).map(n => n.id.toString());
        setChildSelections(deeper);
        notifyFinalSelection(rootId, path[1].id.toString(), deeper);
      } else {
        setSelectedSubgroupId(newSubId);
        setChildSelections([]);
        notifyFinalSelection(rootId, newSubId, []);
      }
      return;
    }

    setSelectedSubgroupId(newSubId);
    setChildSelections([]);
    notifyFinalSelection(selectedParentId, newSubId, []);
  };

  // Handler: Change Dynamic Child Dropdown(s)
  const handleChildChange = (levelIndex, selectedId) => {
    const updated = childSelections.slice(0, levelIndex);
    if (selectedId) updated.push(selectedId);
    setChildSelections(updated);
    notifyFinalSelection(selectedParentId, selectedSubgroupId, updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ── DROPDOWN 1: MAIN GROUP (LEVEL 1 - OPTIONAL) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Main Group (Level 1)
          </label>
          {onAddGroup && (
            <button
              type="button"
              onClick={() => onAddGroup(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                padding: '2px 4px'
              }}
              title="Create a new root group"
            >
              + Add Group
            </button>
          )}
        </div>
        <CustomSelectWithArrow
          options={rootGroups}
          value={selectedParentId}
          onChange={handleParentChange}
          placeholder="-- Select Group (Optional) --"
          onRedirect={(item) => {
            if (onBeforeRedirect) onBeforeRedirect();
            navigate(`/groups/${item.id}`);
          }}
          zIndex={40}
        />
      </div>

      {/* ── DROPDOWN 2: SUB-GROUP (CONTAINS ALL SUB-GROUP LEVELS WITH PREDICTION) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Sub-Group (All Levels)
          </label>
          {onAddGroup && (
            <button
              type="button"
              onClick={() => {
                const targetParentId = selectedParentId ? parseInt(selectedParentId, 10) : null;
                onAddGroup(targetParentId);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                padding: '2px 4px'
              }}
              title="Create a new sub-group under selected main group"
            >
              + Add Sub Group
            </button>
          )}
        </div>
        <CustomSelectWithArrow
          options={subgroupOptions}
          value={selectedSubgroupId}
          onChange={handleSubgroupChange}
          placeholder={selectedParentId ? "-- Select Sub-Group (Optional) --" : "-- Select Sub-Group (All Levels Available) --"}
          onRedirect={(item) => {
            if (onBeforeRedirect) onBeforeRedirect();
            navigate(`/groups/${item.id}`);
          }}
          zIndex={30}
        />
      </div>

      {/* ── DYNAMIC PREDICTED CHILD DROPDOWN(S) (APPEARS ACCORDING TO SELECTED NODE'S CHILDREN) ── */}
      {dynamicChildLevels.map((lvl) => (
        <div key={lvl.levelIndex}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ color: '#2563eb', fontSize: '0.74rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Sub-Group under {lvl.parentName} (Level {lvl.levelNumber})
            </label>
            {onAddGroup && (
              <button
                type="button"
                onClick={() => onAddGroup(parseInt(lvl.parentId, 10))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  padding: '2px 4px'
                }}
                title={`Create a child sub-group under ${lvl.parentName}`}
              >
                + Add Sub Group
              </button>
            )}
          </div>
          <CustomSelectWithArrow
            options={lvl.options || []}
            value={lvl.selectedValue || ''}
            onChange={(val) => handleChildChange(lvl.levelIndex, val)}
            placeholder={`-- Select Sub-Group under ${lvl.parentName} (Optional) --`}
            emptyMessage={`-- No sub-groups under ${lvl.parentName} yet (Click "+ Add Sub Group" above) --`}
            onRedirect={(item) => {
              if (onBeforeRedirect) onBeforeRedirect();
              navigate(`/groups/${item.id}`);
            }}
            zIndex={20 - lvl.levelIndex}
            borderColor="#93c5fd"
            backgroundColor="#f8fafc"
          />
        </div>
      ))}

      {/* ── ACTIVE HIERARCHY BREADCRUMB BADGE ── */}
      {activePathSummary && (
        <div style={{
          padding: '6px 12px',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: '#1e40af'
        }}>
          <span style={{ fontWeight: '700' }}>📁 Selected Path:</span>
          <span>{activePathSummary.text}</span>
          <span style={{
            marginLeft: 'auto',
            backgroundColor: '#dbeafe',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            fontWeight: '600'
          }}>
            Level {activePathSummary.level}
          </span>
        </div>
      )}
    </div>
  );
};

export default CascadingGroupSelect;
